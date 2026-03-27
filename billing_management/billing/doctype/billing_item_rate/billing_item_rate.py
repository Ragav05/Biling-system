from __future__ import annotations

import frappe  # type: ignore
from frappe.utils import flt  # type: ignore


class BillingItemRate(frappe.model.document.Document):
	def validate(self):
		if flt(self.rate) < 0:
			frappe.throw(frappe._("Rate cannot be negative"))

