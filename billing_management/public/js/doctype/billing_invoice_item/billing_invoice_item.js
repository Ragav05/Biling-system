frappe.ui.form.on("Billing Invoice Item", {
	item_code: function (frm, cdt, cdn) {
		const row = locals[cdt][cdn];
		if (!row.item_code) return;

		Promise.all([
			frappe.db.get_value("Billing Item", row.item_code, [
				"default_warehouse",
				"stock_uom",
				"item_name",
			]),
			frappe.call({
				method: "billing_management.billing.pricing.get_item_rate",
				args: {
					item_code: row.item_code,
					posting_date: frm.doc.posting_date || null,
				},
			}),
		]).then(([itemRes, priceRes]) => {
			const data = itemRes && itemRes.message ? itemRes.message : {};
			const priceData = priceRes && priceRes.message ? priceRes.message : {};

			if (priceData.rate != null && (!row.rate || flt(row.rate) === 0)) {
				frappe.model.set_value(cdt, cdn, "rate", flt(priceData.rate) || 0);
			}

			if (!row.warehouse && data.default_warehouse) {
				frappe.model.set_value(cdt, cdn, "warehouse", data.default_warehouse);
			}

			if (data.stock_uom) {
				frappe.model.set_value(cdt, cdn, "stock_uom", data.stock_uom);
			}

			if (data.item_name) {
				frappe.model.set_value(cdt, cdn, "item_name", data.item_name);
			}

			calculate_amount(frm, cdt, cdn);
		});
	},
	qty: function (frm, cdt, cdn) {
		calculate_amount(frm, cdt, cdn);
	},
	rate: function (frm, cdt, cdn) {
		calculate_amount(frm, cdt, cdn);
	},
	refresh: function (frm, cdt, cdn) {
		calculate_amount(frm, cdt, cdn);
	},
});

function calculate_amount(frm, cdt, cdn) {
	const row = locals[cdt][cdn];
	const qty = flt(row.qty) || 0;
	const rate = flt(row.rate) || 0;
	const amount = qty * rate;

	// Keep UI in sync instantly
	frappe.model.set_value(cdt, cdn, "amount", amount);
	billing_item_update_total_amount(frm);
}

function billing_item_update_total_amount(frm) {
	const items = frm.doc.items || [];
	const total = items.reduce((sum, row) => sum + (flt(row.amount) || 0), 0);

	frm.set_value("total_amount", total);
	frm.refresh_field("total_amount");
}

