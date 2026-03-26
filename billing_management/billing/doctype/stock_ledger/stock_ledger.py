import frappe
from frappe.utils import cint, flt

from billing_management.billing.stock.stock_service import get_current_stock_qty


class StockLedger(frappe.model.document.Document):
	def validate(self):
		if not self.item:
			frappe.throw(frappe._("Item is required"))
		if not self.warehouse:
			frappe.throw(frappe._("Warehouse is required"))
		if flt(self.qty) == 0:
			frappe.throw(frappe._("Qty cannot be 0"))

	def on_submit(self):
		# System rule: stock should never go negative.
		if flt(self.qty) >= 0:
			return

		current_qty = get_current_stock_qty(
			self.item,
			self.warehouse,
			exclude_ledger_name=self.name,
		)
		precision = cint(frappe.db.get_single_value("System Settings", "float_precision") or 0)
		projected_qty = flt(current_qty) + flt(self.qty)
		if round(projected_qty, precision) < 0:
			frappe.throw(
				frappe._("Cannot post Stock Ledger entry. Stock would go negative for {0}. Available: {1}, After: {2}").format(
					self.item, current_qty, projected_qty
				)
			)

