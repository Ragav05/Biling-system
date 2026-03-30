# Copyright (c) 2026, Administrator and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe.utils import now_datetime, get_datetime, cint, flt
from billing_management.billing.stock.stock_service import create_and_submit_stock_ledger_entry


class POSOrder(Document):
	def validate(self):
		self.set_missing_fields()
		self.validate_service_mode()
		self.validate_items()
		self.calculate_totals()

	def set_missing_fields(self):
		"""Set missing fields like posting time, customer name, etc."""
		if not self.posting_time:
			self.posting_time = now_datetime().strftime("%H:%M:%S")

		# Auto-generate takeaway token
		if self.order_type == "Takeaway" and not self.takeaway_token:
			self.takeaway_token = self.generate_takeaway_token()

		# Set customer name
		if self.customer and not self.customer_name:
			self.customer_name = frappe.db.get_value("Customer", self.customer, "customer_name")

		# Set default order status
		if not self.order_status:
			self.order_status = "Pending"

		if not self.billing_mode:
			self.billing_mode = "Pay Later"

		if not self.payment_status:
			self.payment_status = "Paid" if self.billing_mode == "Pay Now" else "Unpaid"

	def validate_service_mode(self):
		"""Keep dine-in/takeaway fields mutually consistent."""
		if self.order_type == "Dine-In" and not self.table_no:
			frappe.throw("Table is required for Dine-In orders")

		if self.order_type == "Takeaway":
			self.table_no = ""

		if self.payment_status not in ("Unpaid", "Paid"):
			self.payment_status = "Unpaid"

	def generate_takeaway_token(self) -> str:
		"""Generate unique takeaway token"""
		today = frappe.utils.today()
		count = frappe.db.count("POS Order", {"order_type": "Takeaway", "posting_date": today})
		token_number = count + 1
		return f"TK-{today.replace('-', '')}-{token_number:03d}"

	def validate_items(self):
		"""Validate items and set required fields"""
		if not self.items:
			frappe.throw("Please add at least one item")

		for item in self.items:
			if not item.item_code:
				frappe.throw("Item code is required")

			billing_item = frappe.get_doc("Billing Item", item.item_code)
			item.item_name = billing_item.item_name
			item.stock_uom = billing_item.stock_uom
			item.description = billing_item.description
			item.food_type = billing_item.food_type
			item.item_category = billing_item.item_category

			# Set kitchen station
			if item.send_to_kitchen and not item.kitchen_station:
				item.kitchen_station = billing_item.kitchen_station

			# Auto-fill rate if not provided
			if not item.rate or item.rate == 0:
				item.rate = billing_item.default_rate

			item.amount = item.qty * item.rate

	def calculate_totals(self):
		"""Calculate all totals"""
		self.total_qty = sum(item.qty for item in self.items)
		self.total_amount = sum(item.amount for item in self.items)

		# Keep header discount entered by POS flow, but still support row-level discounts.
		item_discount = sum(item.discount_amount or 0 for item in self.items)
		header_discount = flt(self.discount_amount or 0)
		self.discount_amount = header_discount if header_discount else item_discount

		# Calculate grand total
		self.grand_total = self.total_amount - self.discount_amount + (self.service_charge or 0)

		# Only default paid amount for immediate-pay orders.
		if self.billing_mode == "Pay Now" and not self.paid_amount:
			self.paid_amount = self.grand_total
		elif self.billing_mode != "Pay Now":
			self.paid_amount = 0

		# Calculate change
		self.change_amount = self.paid_amount - self.grand_total if self.paid_amount else 0

	def on_submit(self):
		"""On submit - reduce stock and set initial status"""
		self.reduce_stock()

		has_kitchen_items = any(cint(item.send_to_kitchen) for item in self.items)
		if self.order_type == "Dine-In" and self.table_no:
			frappe.db.set_value("Restaurant Table", self.table_no, "is_available", 0)

		# Set initial order and kitchen status based on actual workflow.
		if has_kitchen_items:
			self.db_set("order_status", "Preparing")
			self.db_set("kitchen_status", "Pending")
		elif self.order_type == "Takeaway":
			self.db_set("order_status", "Ready")
			self.db_set("kitchen_status", None)
		else:
			self.db_set("order_status", "Ready")
			self.db_set("kitchen_status", "Ready")

	def reduce_stock(self):
		"""Reduce stock for all items"""
		for item in self.items:
			billing_item = frappe.get_doc("Billing Item", item.item_code)
			if billing_item.is_stock_item:
				warehouse = item.warehouse or billing_item.default_warehouse
				if warehouse:
					create_and_submit_stock_ledger_entry(
						item=item.item_code,
						warehouse=warehouse,
						qty=-item.qty,
						transaction_type="Sale",
						voucher_type=self.doctype,
						voucher_no=self.name,
						posting_date=str(self.posting_date),
						description=f"Out from {self.doctype} {self.name}",
					)

	def on_cancel(self):
		"""On cancel - restore stock"""
		for item in self.items:
			billing_item = frappe.get_doc("Billing Item", item.item_code)
			if billing_item.is_stock_item:
				warehouse = item.warehouse or billing_item.default_warehouse
				if warehouse:
					create_and_submit_stock_ledger_entry(
						item=item.item_code,
						warehouse=warehouse,
						qty=item.qty,
						transaction_type="Purchase",
						voucher_type=self.doctype,
						voucher_no=self.name,
						posting_date=str(self.posting_date),
						description=f"In from cancel of {self.doctype} {self.name}",
					)


@frappe.whitelist()
def update_order_status(order_name, order_status=None, kitchen_status=None):
	"""Update order and kitchen status"""
	doc = frappe.get_doc("POS Order", order_name)

	if order_status:
		doc.order_status = order_status

	if kitchen_status:
		doc.kitchen_status = kitchen_status

	# Auto-update table status when order is served/picked up
	if order_status in ["Served", "Picked Up"]:
		if doc.order_type == "Dine-In" and doc.table_no:
			frappe.db.set_value("Restaurant Table", doc.table_no, "is_available", 1)

	doc.save(ignore_permissions=True)
	frappe.db.commit()

	return {"success": True}


@frappe.whitelist()
def mark_order_ready(order_name):
	"""Mark order as ready"""
	return update_order_status(order_name, order_status="Ready")


@frappe.whitelist()
def mark_order_served(order_name):
	"""Mark Dine-In order as served"""
	doc = frappe.get_doc("POS Order", order_name)
	if doc.order_type != "Dine-In":
		frappe.throw("This action is only for Dine-In orders")

	return update_order_status(order_name, order_status="Served", kitchen_status="Served")


@frappe.whitelist()
def mark_order_picked_up(order_name):
	"""Mark Takeaway order as picked up"""
	doc = frappe.get_doc("POS Order", order_name)
	if doc.order_type != "Takeaway":
		frappe.throw("This action is only for Takeaway orders")

	return update_order_status(order_name, order_status="Picked Up")
