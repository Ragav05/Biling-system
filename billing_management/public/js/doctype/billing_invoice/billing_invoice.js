frappe.ui.form.on("Billing Invoice", {
	onload: function (frm) {
		billing_invoice_update_total_amount(frm);
	},
	refresh: function (frm) {
		billing_invoice_update_total_amount(frm);

		if (frm.doc.docstatus === 1 && frm.doc.status === "Submitted" && !frm.custom_mark_paid_button_added) {
			frm.custom_mark_paid_button_added = true;
			frm.add_custom_button(
				__("Mark Paid"),
				function () {
					frappe.call({
						method: "billing_management.billing.doctype.billing_invoice.billing_invoice.mark_as_paid",
						args: {
							invoice_name: frm.doc.name,
						},
						callback: function (r) {
							if (!r.exc) {
								frm.reload_doc();
							}
						},
					});
				},
				__("Actions")
			);
		}
	},
	items_add: function (frm) {
		billing_invoice_update_total_amount(frm);
	},
	items_remove: function (frm) {
		billing_invoice_update_total_amount(frm);
	},
});

function billing_invoice_update_total_amount(frm) {
	const items = frm.doc.items || [];
	const total = items.reduce((sum, row) => sum + (flt(row.amount) || 0), 0);
	frm.set_value("total_amount", total);
	frm.refresh_field("total_amount");
}

