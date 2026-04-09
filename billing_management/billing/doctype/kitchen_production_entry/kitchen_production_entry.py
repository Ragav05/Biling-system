from __future__ import annotations

import frappe
from frappe.model.document import Document
from frappe.utils import flt, nowtime

from billing_management.billing.stock.stock_service import create_and_submit_stock_ledger_entry


class KitchenProductionEntry(Document):
	def validate(self):
		self.set_missing_values()
		self.validate_item()

	def set_missing_values(self):
		if not self.production_time:
			self.production_time = nowtime()

		if self.production_item:
			self.stock_uom = frappe.db.get_value("Billing Item", self.production_item, "stock_uom")
			if not self.warehouse:
				self.warehouse = frappe.db.get_value(
					"Billing Item", self.production_item, "default_warehouse"
				)
			if not self.kitchen_station:
				self.kitchen_station = frappe.db.get_value(
					"Billing Item", self.production_item, "kitchen_station"
				)

	def validate_item(self):
		if flt(self.quantity_prepared) <= 0:
			frappe.throw(frappe._("Quantity Prepared must be greater than 0"))

		if not self.production_item:
			frappe.throw(frappe._("Prepared Item is required"))

		item = frappe.get_doc("Billing Item", self.production_item)
		if not item.is_stock_item:
			frappe.throw(frappe._("Maintain Stock must be enabled for item {0}").format(self.production_item))
		if not item.default_warehouse and not self.warehouse:
			frappe.throw(frappe._("Default Warehouse is required for item {0}").format(self.production_item))
		if not item.stock_uom:
			frappe.throw(frappe._("Stock UOM is required for item {0}").format(self.production_item))

	def on_submit(self):
		ledger_name = create_and_submit_stock_ledger_entry(
			item=self.production_item,
			warehouse=self.warehouse,
			qty=self.quantity_prepared,
			transaction_type="Adjustment",
			voucher_type="Kitchen Production",
			voucher_no=self.name,
			posting_date=self.production_date,
			description=self._build_description(),
		)
		self.db_set("stock_ledger_entry", ledger_name, update_modified=False)

	def on_cancel(self):
		reversal_name = create_and_submit_stock_ledger_entry(
			item=self.production_item,
			warehouse=self.warehouse,
			qty=-flt(self.quantity_prepared),
			transaction_type="Adjustment",
			voucher_type="Kitchen Production Cancel",
			voucher_no=self.name,
			posting_date=frappe.utils.nowdate(),
			description=f"Reversal of kitchen production {self.name}",
		)
		self.db_set("reversal_stock_ledger_entry", reversal_name, update_modified=False)

	def _build_description(self) -> str:
		station = f" at {self.kitchen_station}" if self.kitchen_station else ""
		notes = f" Notes: {self.production_notes}" if self.production_notes else ""
		return f"Kitchen prepared {flt(self.quantity_prepared)} {self.stock_uom or ''} of {self.production_item}{station}.{notes}".strip()
