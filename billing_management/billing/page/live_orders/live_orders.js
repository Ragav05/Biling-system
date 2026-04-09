frappe.pages["live-orders"].on_page_load = function (wrapper) {
	const state = {
		filterType: "All",
		filterPayment: "All",
		orders: [],
		tables: [],
		stats: {},
	};

	$(wrapper).html(`
		<div class="liveops-shell">
			<div class="liveops-header">
				<div>
					<div class="liveops-eyebrow">Restaurant Operations</div>
					<h1>Live Orders Control Room</h1>
					<p>Monitor dine-in, takeaway, kitchen progress, and pending bills in real time.</p>
				</div>
				<div class="liveops-actions">
					<button class="btn btn-light btn-sm liveops-open-pos">Open POS</button>
					<button class="btn btn-light btn-sm liveops-refresh">Refresh</button>
				</div>
			</div>

			<div class="liveops-stat-grid">
				<div class="liveops-stat-card"><span>Active Orders</span><strong data-stat="active_orders">0</strong></div>
				<div class="liveops-stat-card"><span>Pending Kitchen</span><strong data-stat="pending_kitchen">0</strong></div>
				<div class="liveops-stat-card"><span>Ready Orders</span><strong data-stat="ready_orders">0</strong></div>
				<div class="liveops-stat-card"><span>Occupied Tables</span><strong data-stat="occupied_tables">0</strong></div>
				<div class="liveops-stat-card"><span>Unpaid Orders</span><strong data-stat="unpaid_orders">0</strong></div>
				<div class="liveops-stat-card"><span>Takeaway Orders</span><strong data-stat="takeaway_orders">0</strong></div>
			</div>

			<div class="liveops-payment-summary">
				<div class="liveops-payment-head"><h3>Today's Payment Summary</h3></div>
				<div class="liveops-payment-grid" data-payment-summary></div>
			</div>

			<div class="liveops-filter-row">
				<div class="liveops-chip-group" data-role="type">
					<button class="liveops-chip active" data-value="All">All</button>
					<button class="liveops-chip" data-value="Dine-In">Dine-In</button>
					<button class="liveops-chip" data-value="Takeaway">Takeaway</button>
				</div>
				<div class="liveops-chip-group" data-role="payment">
					<button class="liveops-chip active" data-value="All">All Payments</button>
					<button class="liveops-chip" data-value="Unpaid">Unpaid</button>
					<button class="liveops-chip" data-value="Paid">Paid</button>
				</div>
			</div>

			<div class="liveops-grid">
				<section class="liveops-panel">
					<div class="liveops-panel-head">
						<div>
							<h3>Order Queue</h3>
							<p>Track what the kitchen and floor team need to do next.</p>
						</div>
					</div>
					<div class="liveops-orders-grid"></div>
				</section>

				<section class="liveops-panel">
					<div class="liveops-panel-head">
						<div>
							<h3>Table Status</h3>
							<p>See which tables are free and which are currently occupied.</p>
						</div>
					</div>
					<div class="liveops-table-grid"></div>
				</section>
			</div>
		</div>
	`);

	if (!document.getElementById("liveops-style")) {
		const style = document.createElement("style");
		style.id = "liveops-style";
		style.innerHTML = `
			.liveops-shell { padding:18px; background:#f4f6fb; min-height:100%; }
			.liveops-header { display:flex; justify-content:space-between; gap:16px; align-items:flex-start; padding:22px; border-radius:24px; background:linear-gradient(135deg, #0f766e, #0f172a); color:#fff; margin-bottom:18px; }
			.liveops-eyebrow { text-transform:uppercase; font-size:11px; letter-spacing:.12em; opacity:.75; margin-bottom:8px; }
			.liveops-header h1 { margin:0; font-size:30px; font-weight:700; }
			.liveops-header p { margin:8px 0 0; opacity:.9; }
			.liveops-actions { display:flex; gap:10px; }
			.liveops-actions .btn { border:none; border-radius:12px; padding:10px 14px; font-weight:700; }
			.liveops-stat-grid { display:grid; grid-template-columns:repeat(6, minmax(0,1fr)); gap:12px; margin-bottom:16px; }
			.liveops-stat-card { background:#fff; border:1px solid #e5eaf4; border-radius:18px; padding:14px 16px; box-shadow:0 8px 20px rgba(15,23,42,.05); }
			.liveops-stat-card span { display:block; color:#64748b; font-size:12px; margin-bottom:6px; }
			.liveops-stat-card strong { font-size:24px; color:#0f172a; }
			.liveops-filter-row { display:flex; justify-content:space-between; gap:14px; margin-bottom:16px; flex-wrap:wrap; }
			.liveops-chip-group { display:flex; gap:10px; flex-wrap:wrap; }
			.liveops-chip { border:1px solid #d8dfef; background:#fff; border-radius:999px; padding:10px 15px; font-weight:700; color:#334155; }
			.liveops-chip.active { background:linear-gradient(135deg, #0f766e, #0f9b7a); border-color:transparent; color:#fff; }
			.liveops-grid { display:grid; grid-template-columns:1.55fr .85fr; gap:18px; }
			.liveops-panel { background:#fff; border:1px solid #e7edf5; border-radius:24px; padding:20px; box-shadow:0 12px 32px rgba(15,23,42,.05); }
			.liveops-panel-head h3 { margin:0; font-size:22px; color:#0f172a; }
			.liveops-panel-head p { margin:4px 0 0; color:#64748b; font-size:13px; }
			.liveops-orders-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(320px,1fr)); gap:14px; margin-top:16px; }
			.liveops-order-card { border:1px solid #e6ebf5; border-radius:20px; padding:16px; background:linear-gradient(180deg, #fff, #fcfdff); }
			.liveops-order-top { display:flex; justify-content:space-between; gap:8px; margin-bottom:12px; }
			.liveops-order-title { font-size:18px; font-weight:700; color:#0f172a; }
			.liveops-order-meta { color:#64748b; font-size:12px; }
			.liveops-badge { display:inline-flex; align-items:center; padding:4px 10px; border-radius:999px; font-size:12px; font-weight:700; }
			.liveops-badge.ready { background:#dcfce7; color:#166534; }
			.liveops-badge.preparing { background:#e0e7ff; color:#3730a3; }
			.liveops-badge.pending { background:#ffedd5; color:#c2410c; }
			.liveops-badge.unpaid { background:#fee2e2; color:#b91c1c; }
			.liveops-badge.paid { background:#e2e8f0; color:#334155; }
			.liveops-order-body { display:flex; flex-direction:column; gap:10px; }
			.liveops-order-line { display:flex; justify-content:space-between; gap:8px; color:#334155; font-size:13px; }
			.liveops-item-list { border-top:1px solid #eef2f7; padding-top:10px; display:flex; flex-direction:column; gap:6px; }
			.liveops-item { display:flex; justify-content:space-between; gap:8px; font-size:13px; }
			.liveops-item small { color:#64748b; display:block; }
			.liveops-order-actions { display:flex; flex-wrap:wrap; gap:8px; margin-top:12px; }
			.liveops-order-actions .btn { border-radius:12px; font-weight:700; }
			.liveops-empty { padding:24px; border:1px dashed #d9e2f1; border-radius:18px; text-align:center; color:#64748b; background:#fafcff; }
			.liveops-table-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(160px,1fr)); gap:12px; margin-top:16px; }
			.liveops-table-card { border-radius:18px; padding:16px; border:1px solid #e5ebf4; background:#fff; }
			.liveops-table-card.occupied { background:linear-gradient(135deg, #fff7ed, #fff1e6); border-color:#fed7aa; }
			.liveops-table-card.available { background:linear-gradient(135deg, #ecfdf5, #f0fdf4); border-color:#bbf7d0; }
			.liveops-table-card strong { display:block; font-size:18px; color:#0f172a; }
			.liveops-table-card span { color:#64748b; font-size:12px; }
			.liveops-payment-summary { background:#fff; border:1px solid #e5eaf4; border-radius:18px; padding:16px 18px; margin-bottom:16px; box-shadow:0 8px 20px rgba(15,23,42,.05); }
			.liveops-payment-head h3 { margin:0 0 12px; font-size:16px; color:#0f172a; }
			.liveops-payment-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(140px,1fr)); gap:10px; }
			.liveops-payment-item { background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:12px 14px; }
			.liveops-payment-item .label { color:#64748b; font-size:12px; margin-bottom:4px; }
			.liveops-payment-item .amount { font-size:18px; font-weight:700; color:#0f172a; }
			.liveops-payment-item .count { color:#64748b; font-size:11px; }
			@media (max-width: 1200px) { .liveops-stat-grid { grid-template-columns:repeat(3, minmax(0,1fr)); } .liveops-grid { grid-template-columns:1fr; } }
			@media (max-width: 768px) { .liveops-shell { padding:12px; } .liveops-header { flex-direction:column; } .liveops-stat-grid { grid-template-columns:repeat(2, minmax(0,1fr)); } .liveops-payment-grid { grid-template-columns:repeat(2, minmax(0,1fr)); } }
		`;
		document.head.appendChild(style);
	}

	const $orders = $(wrapper).find(".liveops-orders-grid");
	const $tables = $(wrapper).find(".liveops-table-grid");

	function formatMoney(value) {
		const currencyCode =
			(frappe.defaults && frappe.defaults.get_default && frappe.defaults.get_default("currency")) || "INR";
		return typeof format_currency === "function" ? format_currency(flt(value), currencyCode) : `₹ ${flt(value)}`;
	}

	function statusClass(value) {
		const slug = (value || "pending").toLowerCase().replace(/\s+/g, "-");
		if (slug.includes("ready")) return "ready";
		if (slug.includes("preparing") || slug.includes("progress")) return "preparing";
		if (slug.includes("paid")) return "paid";
		if (slug.includes("unpaid")) return "unpaid";
		return "pending";
	}

	function renderStats() {
		Object.keys(state.stats || {}).forEach((key) => {
			$(wrapper).find(`[data-stat="${key}"]`).text(state.stats[key] || 0);
		});
	}

	function renderPaymentSummary() {
		const $grid = $(wrapper).find("[data-payment-summary]");
		$grid.empty();
		const payments = state.payment_summary || [];
		if (!payments.length) {
			$grid.html('<div class="liveops-empty">No paid orders today.</div>');
			return;
		}
		payments.forEach((row) => {
			const method = row.payment_method || "Unknown";
			$grid.append(`
				<div class="liveops-payment-item">
					<div class="label">${frappe.utils.escape_html(method)}</div>
					<div class="amount">${formatMoney(row.total_amount)}</div>
					<div class="count">${row.count} order(s)</div>
				</div>
			`);
		});
	}

	function renderTables() {
		$tables.empty();
		if (!state.tables.length) {
			$tables.html('<div class="liveops-empty">No restaurant tables configured yet.</div>');
			return;
		}

		state.tables.forEach((table) => {
			const available = cint(table.is_available) === 1;
			$tables.append(`
				<div class="liveops-table-card ${available ? "available" : "occupied"}">
					<strong>${frappe.utils.escape_html(table.table_name)}</strong>
					<span>${frappe.utils.escape_html(table.zone || "Floor")}</span>
					<div style="margin-top:10px; font-weight:700; color:${available ? "#166534" : "#c2410c"};">${available ? "Available" : "Occupied"}</div>
				</div>
			`);
		});
	}

	function openBillDialog(order) {
		const dialog = new frappe.ui.Dialog({
			title: __("Generate Bill"),
			fields: [
				{ fieldtype: "HTML", fieldname: "summary", options: `<div style="padding:12px 14px;border:1px solid #e2e8f0;border-radius:12px;background:#f8fafc;display:flex;justify-content:space-between;"><span>${frappe.utils.escape_html(order.name)}</span><strong>${formatMoney(order.grand_total)}</strong></div>` },
				{ fieldtype: "Check", fieldname: "mark_paid", label: __("Collect payment now"), default: 1 },
				{ fieldtype: "Select", fieldname: "payment_method", label: __("Payment Method"), options: "Cash\nCard\nUPI\nWallet\nNet Banking\nCredit", default: "Cash" },
				{ fieldtype: "Float", fieldname: "payment_amount", label: __("Amount"), default: order.grand_total },
			],
			primary_action_label: __("Generate Bill"),
			primary_action(values) {
				frappe.call({
					method: "billing_management.billing.page.live_orders.live_orders.create_bill",
					args: {
						order_name: order.name,
						payment_method: values.mark_paid ? values.payment_method : null,
						payment_amount: values.mark_paid ? values.payment_amount : 0,
						mark_paid: values.mark_paid ? 1 : 0,
					},
					freeze: true,
					freeze_message: __("Generating bill..."),
					callback(r) {
						if (r.exc) return;
						dialog.hide();
						const result = r.message || {};
						frappe.show_alert({ message: __("Bill {0} generated", [result.invoice_name]), indicator: "green" });
						load();
						frappe.set_route("Form", "Billing Invoice", result.invoice_name);
					}
				});
			},
		});
		dialog.show();
	}

	function renderOrders() {
		$orders.empty();
		if (!state.orders.length) {
			$orders.html('<div class="liveops-empty">No active orders for the selected filters.</div>');
			return;
		}

		state.orders.forEach((order) => {
			const contextLabel = order.order_type === "Takeaway" ? order.takeaway_token || "Token on order" : order.table_no || "Table pending";
			const card = $(
				`<div class="liveops-order-card">
					<div class="liveops-order-top">
						<div>
							<div class="liveops-order-title">${frappe.utils.escape_html(order.name)}</div>
							<div class="liveops-order-meta">${frappe.utils.escape_html(order.order_type)} • ${frappe.utils.escape_html(contextLabel)} • ${order.elapsed_minutes} min ago</div>
						</div>
						<div style="display:flex; flex-direction:column; gap:6px; align-items:flex-end;">
							<span class="liveops-badge ${statusClass(order.order_status)}">${frappe.utils.escape_html(order.order_status)}</span>
							<span class="liveops-badge ${statusClass(order.payment_status)}">${frappe.utils.escape_html(order.payment_status)}</span>
						</div>
					</div>
					<div class="liveops-order-body">
						<div class="liveops-order-line"><span>Kitchen</span><strong>${frappe.utils.escape_html(order.kitchen_status || "Not sent")}</strong></div>
						<div class="liveops-order-line"><span>Billing Mode</span><strong>${frappe.utils.escape_html(order.billing_mode || "Pay Later")}</strong></div>
						<div class="liveops-order-line"><span>Total</span><strong>${formatMoney(order.grand_total)}</strong></div>
						<div class="liveops-item-list"></div>
						<div class="liveops-order-actions"></div>
					</div>
				</div>`
			);

			const $items = card.find(".liveops-item-list");
			(order.items || []).forEach((item) => {
				$items.append(`<div class="liveops-item"><div><strong>${frappe.utils.escape_html(item.item_name)}</strong>${item.item_modifications ? `<small>${frappe.utils.escape_html(item.item_modifications)}</small>` : ""}</div><span>x${flt(item.qty)}</span></div>`);
			});

			const $actions = card.find(".liveops-order-actions");
			if (order.order_status === "Pending") {
				$actions.append('<button class="btn btn-default btn-sm" data-action="Preparing">Start Prep</button>');
			}
			if (order.order_status === "Preparing") {
				$actions.append('<button class="btn btn-default btn-sm" data-action="Ready">Mark Ready</button>');
			}
			if (order.order_status === "Ready") {
				$actions.append(`<button class="btn btn-default btn-sm" data-action="${order.order_type === "Takeaway" ? "Picked Up" : "Served"}">${order.order_type === "Takeaway" ? "Picked Up" : "Served"}</button>`);
			}
			$actions.append('<button class="btn btn-default btn-sm" data-action="open">Open</button>');
			const canGenerateBill =
				!order.billing_invoice
				&& ((order.order_type === "Dine-In" && order.order_status === "Served")
					|| order.order_type !== "Dine-In");

			if (canGenerateBill) {
				$actions.append('<button class="btn btn-primary btn-sm" data-action="bill">Generate Bill</button>');
			} else if (order.billing_invoice) {
				$actions.append('<button class="btn btn-primary btn-sm" data-action="invoice">Open Bill</button>');
			}

			$actions.find("button").on("click", function () {
				const action = $(this).data("action");
				if (action === "open") {
					frappe.set_route("Form", "POS Order", order.name);
					return;
				}
				if (action === "invoice") {
					frappe.set_route("Form", "Billing Invoice", order.billing_invoice);
					return;
				}
				if (action === "bill") {
					openBillDialog(order);
					return;
				}
				frappe.call({
					method: "billing_management.billing.page.live_orders.live_orders.update_order_status",
					args: { order_name: order.name, status: action },
					callback(r) {
						if (r.exc) return;
						frappe.show_alert({ message: __("Order updated"), indicator: "green" });
						load();
					}
				});
			});

			$orders.append(card);
		});
	}

	function load() {
		frappe.call({
			method: "billing_management.billing.page.live_orders.live_orders.get_live_orders_data",
			args: {
				order_type: state.filterType === "All" ? null : state.filterType,
				payment_status: state.filterPayment === "All" ? null : state.filterPayment,
			},
			freeze: true,
			freeze_message: __("Loading live operations..."),
			callback(r) {
				if (r.exc) return;
				state.orders = r.message.orders || [];
				state.tables = r.message.tables || [];
				state.stats = r.message.stats || {};
				state.payment_summary = r.message.payment_summary || [];
				renderStats();
				renderPaymentSummary();
				renderOrders();
				renderTables();
			}
		});
	}

	$(wrapper).find(".liveops-chip-group .liveops-chip").on("click", function () {
		const $button = $(this);
		$button.siblings().removeClass("active");
		$button.addClass("active");
		const role = $button.closest(".liveops-chip-group").data("role");
		if (role === "type") state.filterType = $button.data("value");
		if (role === "payment") state.filterPayment = $button.data("value");
		load();
	});
	$(wrapper).find(".liveops-open-pos").on("click", () => frappe.set_route("billing-dashboard"));
	$(wrapper).find(".liveops-refresh").on("click", load);

	load();
};
