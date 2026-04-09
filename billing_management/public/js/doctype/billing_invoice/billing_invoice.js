frappe.ui.form.on("Billing Invoice", {
	onload: function (frm) {
		billing_invoice_update_total_amount(frm);
		
		// Set default order type to Dine-In
		if (!frm.doc.order_type) {
			frm.set_value('order_type', 'Dine-In');
		}
	},
	refresh: function (frm) {
		billing_invoice_update_total_amount(frm);

		// Add Order Type quick selection buttons
		if (frm.doc.docstatus === 0) {
			frm.add_custom_button(
				__("🍽️ Dine-In"),
				function () {
					frm.set_value('order_type', 'Dine-In');
					frm.refresh_field('order_type');
					frm.trigger('order_type');
				}
			).addClass('btn-primary');
			
			frm.add_custom_button(
				__("🛍️ Takeaway"),
				function () {
					frm.set_value('order_type', 'Takeaway');
					frm.set_value('table_number', '');  // Clear table for takeaway
					frm.refresh_field('order_type');
					frm.refresh_field('table_number');
					frm.trigger('order_type');
				}
			).addClass('btn-secondary');
		}

		// Add Live Orders button
		frm.add_custom_button(
			__("📍 Live Orders"),
			function () {
				frappe.set_route('live-orders');
			}
		);

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
		
		// Add kitchen status update buttons for Dine-In orders only
		if (frm.doc.docstatus === 1 && frm.doc.order_type === 'Dine-In' && frm.doc.kitchen_status !== 'Served') {
			if (frm.doc.kitchen_status !== 'Ready') {
				frm.add_custom_button(
					__("🍳 Mark Ready"),
					function () {
						frappe.call({
							method: "billing_management.billing.doctype.billing_invoice.billing_invoice.update_kitchen_status",
							args: {
								invoice_name: frm.doc.name,
								status: "Ready"
							},
							callback: function (r) {
								if (r.message) {
									frm.reload_doc();
									frappe.show_alert({
										message: __('Order marked as Ready'),
										indicator: 'green'
									});
								}
							}
						});
					},
					__("Kitchen Status")
				);
			}
			if (frm.doc.kitchen_status !== 'In Progress' && frm.doc.kitchen_status !== 'Pending') {
				frm.add_custom_button(
					__("👨‍🍳 Send to Kitchen"),
					function () {
						frappe.call({
							method: "billing_management.billing.doctype.billing_invoice.billing_invoice.update_kitchen_status",
							args: {
								invoice_name: frm.doc.name,
								status: "In Progress"
							},
							callback: function (r) {
								if (r.message) {
									frm.reload_doc();
									frappe.show_alert({
										message: __('Order sent to kitchen'),
										indicator: 'green'
									});
								}
							}
						});
					},
					__("Kitchen Status")
				);
			}
			frm.add_custom_button(
				__("✅ Mark Served"),
				function () {
					frappe.call({
						method: "billing_management.billing.doctype.billing_invoice.billing_invoice.update_kitchen_status",
						args: {
							invoice_name: frm.doc.name,
							status: "Served"
						},
						callback: function (r) {
							if (r.message) {
								frm.reload_doc();
								frappe.show_alert({
									message: __('Order marked as Served'),
									indicator: 'green'
								});
							}
						}
					});
				},
				__("Kitchen Status")
			);
		}
	},
	order_type: function(frm) {
		// Handle order type changes
		if (frm.doc.order_type === 'Takeaway' || frm.doc.order_type === 'Delivery') {
			frm.set_value('table_number', '');  // Clear table for takeaway/delivery
			frm.set_value('kitchen_status', '');  // No kitchen tracking
			frm.refresh_field('table_number');
			frm.refresh_field('kitchen_status');
		} else if (frm.doc.order_type === 'Dine-In') {
			frm.set_value('kitchen_status', 'Pending');  // Set kitchen status for dine-in
			frm.refresh_field('kitchen_status');
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
