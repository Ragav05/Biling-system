frappe.ui.form.on("Billing Item", {
	refresh(frm) {
		make_stock_status_dashboard(frm);
	},
});

function make_stock_status_dashboard(frm) {
	if (frm.doc.__islocal) return;

	if (!frm.dashboard) return;

	if (!frm.dashboard._billingStockStatusSection) {
		frm.dashboard._billingStockStatusSection = frm.dashboard.add_section(
			"",
			__("Stock Status Summary")
		);
	}

	const section = frm.dashboard._billingStockStatusSection;
	section.empty();
	section.append(`<div class="text-muted">${__("Loading...")}</div>`);

	frappe.call({
		method: "billing_management.billing.stock.dashboard.get_stock_dashboard_data",
		callback(r) {
			const msg = r && r.message ? r.message : {};
			const total = msg.total_items ?? 0;
			const low = msg.low_stock_items ?? 0;
			const out = msg.out_of_stock_items ?? 0;

			section.empty();
			section.append(`
				<div style="display: flex; gap: 16px; flex-wrap: wrap;">
					<div class="card" style="min-width: 220px; padding: 12px;">
						<div class="text-muted small">${__("Total Items")}</div>
						<div style="font-size: 26px; font-weight: 600;">${total}</div>
					</div>
					<div class="card" style="min-width: 220px; padding: 12px;">
						<div class="text-muted small">${__("Low Stock Items")}</div>
						<div style="font-size: 26px; font-weight: 600;">${low}</div>
					</div>
					<div class="card" style="min-width: 220px; padding: 12px;">
						<div class="text-muted small">${__("Out of Stock Items")}</div>
						<div style="font-size: 26px; font-weight: 600;">${out}</div>
					</div>
				</div>
			`);
		},
	});
}

