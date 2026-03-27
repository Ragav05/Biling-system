import frappe  # type: ignore
from frappe.utils import flt  # type: ignore


class BillingItem(frappe.model.document.Document):
	def validate(self):
		if self.is_stock_item:
			if not self.default_warehouse:
				frappe.throw(frappe._("Default Warehouse is required for stock tracking"))
			if not self.stock_uom:
				frappe.throw(frappe._("Stock UOM is required for stock tracking"))

		# Validate date-wise price history
		seen_dates: set[str] = set()
		for row in self.get("price_history") or []:
			if not row.rate_date:
				frappe.throw(frappe._("Rate Date is required in Price History"))
			date_key = str(row.rate_date)
			if date_key in seen_dates:
				frappe.throw(frappe._("Duplicate Rate Date found in Price History: {0}").format(date_key))
			seen_dates.add(date_key)
			if flt(row.rate) < 0:
				frappe.throw(frappe._("Rate cannot be negative for date {0}").format(date_key))

