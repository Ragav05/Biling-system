from __future__ import annotations

import frappe  # type: ignore
from frappe.utils import cint, flt  # type: ignore

from billing_management.billing.stock.stock_service import (
	create_and_submit_stock_ledger_entry,
	get_current_stock_qty,
)
from billing_management.billing.pricing import get_effective_item_rate


class BillingInvoice(frappe.model.document.Document):
	def validate(self):
		# ERPNext-like state handling:
		# Draft -> Submitted on submit, then Paid via explicit server action.
		if self.docstatus == 0:
			self.status = "Draft"
		elif self.docstatus == 1:
			self.status = "Paid" if self.status == "Paid" else "Submitted"
		else:
			# Cancelled state is not part of our simplified status flow.
			self.status = "Submitted"

		non_empty_rows = [row for row in (self.items or []) if row.item_code]
		if not non_empty_rows:
			frappe.throw(frappe._("Invoice must have at least one item"))

		# Consolidate requirements for a clean "no negative stock" validation.
		requirements: dict[tuple[str, str], float] = {}
		total_qty = 0.0
		total_amount = 0.0

		for row in self.items:
			if not row.item_code:
				frappe.throw(frappe._("Row item is required"))
			if flt(row.qty) <= 0:
				frappe.throw(frappe._("Row quantity must be greater than 0"))

			item = frappe.get_doc("Billing Item", row.item_code)
			if not item.is_stock_item:
				frappe.throw(frappe._("Item {0} is not marked as a stock item").format(row.item_code))

			warehouse = row.warehouse or item.default_warehouse
			if not warehouse:
				frappe.throw(
					frappe._("Warehouse is missing for item {0}. Set item default warehouse or row warehouse.")
					.format(row.item_code)
				)

			row.item_name = item.item_name
			row.stock_uom = item.stock_uom
			row.warehouse = warehouse

			# Auto-fill rate from effective date-wise pricing if not provided.
			# (Client scripts should do this, but backend must stay authoritative.)
			if row.rate is None or row.rate == "" or flt(row.rate) == 0:
				row.rate = get_effective_item_rate(row.item_code, posting_date=str(self.posting_date))

			row.rate = flt(row.rate)
			row.amount = flt(row.qty) * flt(row.rate)

			total_qty += flt(row.qty)
			total_amount += flt(row.amount)

			requirements[(row.item_code, warehouse)] = requirements.get((row.item_code, warehouse), 0.0) + flt(
				row.qty
			)

		self.total_qty = flt(total_qty)
		self.total_amount = flt(total_amount)

		# Discount / totals
		discount_percentage = flt(getattr(self, "discount_percentage", 0) or 0)
		if discount_percentage < 0 or discount_percentage > 100:
			frappe.throw(frappe._("Discount Percentage must be between 0 and 100"))

		precision = cint(frappe.db.get_single_value("System Settings", "float_precision") or 0)
		self.discount_percentage = flt(discount_percentage)
		self.discount_amount = flt(round(self.total_amount * self.discount_percentage / 100, precision))
		self.grand_total = flt(round(self.total_amount - self.discount_amount, precision))

	def on_submit(self):
		# Transition Draft -> Submitted.
		self.status = "Submitted"

		# Backend rules:
		# - validate stock availability
		# - reduce stock (via Stock Ledger qty decrease)
		# - never allow negative stock
		resolved_rows: list[tuple[object, object, str, float]] = []
		requirements: dict[tuple[str, str], float] = {}

		for row in self.items:
			if not row.item_code:
				frappe.throw(frappe._("Invoice row item is required"))

			item = frappe.get_doc("Billing Item", row.item_code)
			if not item.is_stock_item:
				frappe.throw(frappe._("Item {0} is not marked as a stock item").format(row.item_code))

			warehouse = row.warehouse or item.default_warehouse
			if not warehouse:
				frappe.throw(
					frappe._(
						"Warehouse is missing for item {0}. Set Billing Item default warehouse or row warehouse."
					).format(row.item_code)
				)

			qty = flt(row.qty)
			if qty <= 0:
				frappe.throw(frappe._("Row quantity must be greater than 0 for item {0}").format(row.item_code))

			resolved_rows.append((row, item, warehouse, qty))
			requirements[(row.item_code, warehouse)] = requirements.get((row.item_code, warehouse), 0.0) + qty

		precision = cint(frappe.db.get_single_value("System Settings", "float_precision") or 0)

		for (item_code, warehouse), required_qty in requirements.items():
			current_qty = get_current_stock_qty(item_code, warehouse)
			# Use precision to avoid float rounding issues.
			if round(current_qty - flt(required_qty), precision) < 0:
				frappe.throw(
					frappe._(
						"Insufficient stock for item {0} in warehouse {1}. Available: {2}, Required: {3}"
					).format(item_code, warehouse, current_qty, required_qty)
				)

		for row, _item, warehouse, qty in resolved_rows:
			# "Reduce stock quantity" is achieved by posting an `Out` Stock Ledger entry.
			create_and_submit_stock_ledger_entry(
				item=row.item_code,
				warehouse=warehouse,
				qty=-qty,
				transaction_type="Out",
				voucher_type=self.doctype,
				voucher_no=self.name,
				posting_date=str(self.posting_date),
				description=f"Out from {self.doctype} {self.name}",
			)

	def on_cancel(self):
		# Keep status consistent with submitted->paid flow.
		self.status = "Submitted"

		# Restore stock by posting an opposite Stock Ledger entry.
		for row in self.items:
			create_and_submit_stock_ledger_entry(
				item=row.item_code,
				warehouse=row.warehouse,
				qty=flt(row.qty),
				transaction_type="In",
				voucher_type=self.doctype,
				voucher_no=self.name,
				posting_date=str(self.posting_date),
				description=f"In from cancel of {self.doctype} {self.name}",
			)

	def on_trash(self):
		# Submitted invoices should be cancelled before deletion.
		if self.docstatus == 1:
			frappe.throw(
				frappe._("Cannot delete submitted invoice {0}. Please cancel it first.").format(self.name)
			)


@frappe.whitelist()
def mark_as_paid(invoice_name: str) -> dict[str, str]:
	"""Mark a submitted Billing Invoice as Paid."""
	doc = frappe.get_doc("Billing Invoice", invoice_name)

	if doc.docstatus != 1:
		frappe.throw(frappe._("Only submitted invoices can be marked as Paid"))

	# Only allow Paid transition (no automatic unmarking here).
	doc.db_set("status", "Paid", update_modified=False)
	return {"status": "Paid"}

