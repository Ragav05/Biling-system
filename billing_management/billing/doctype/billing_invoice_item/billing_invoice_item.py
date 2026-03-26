import frappe  # type: ignore


class BillingInvoiceItem(frappe.model.document.Document):
	# Intentionally empty: all validation/amount calculation happens in `BillingInvoice`.
	pass

