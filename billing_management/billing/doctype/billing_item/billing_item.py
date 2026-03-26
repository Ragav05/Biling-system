import frappe


class BillingItem(frappe.model.document.Document):
	def validate(self):
		if self.is_stock_item:
			if not self.default_warehouse:
				frappe.throw(frappe._("Default Warehouse is required for stock tracking"))
			if not self.stock_uom:
				frappe.throw(frappe._("Stock UOM is required for stock tracking"))

