frappe.pages["billing-analytics"].on_page_load = function (wrapper) {
	const state = {
		range: 7,
		data: null,
		charts: {},
		autoRefresh: null,
	};

	const $wrapper = $(wrapper);
	$wrapper.html(`
		<div class="bz-shell">
			<div class="bz-aurora"></div>

			<header class="bz-topbar">
				<div class="bz-brand">
					<div class="bz-brand-badge">BC</div>
					<div>
						<div class="bz-brand-eyebrow">Billing Command Center</div>
						<h1 class="bz-brand-title">Analytics Dashboard</h1>
						<div class="bz-brand-sub" data-generated>Loading latest data…</div>
					</div>
				</div>
				<div class="bz-topbar-actions">
					<div class="bz-range" data-role="range">
						<button class="bz-range-btn" data-range="1">Today</button>
						<button class="bz-range-btn active" data-range="7">7 days</button>
						<button class="bz-range-btn" data-range="30">30 days</button>
					</div>
					<button class="bz-btn bz-btn-ghost" data-action="pos">Open POS</button>
					<button class="bz-btn bz-btn-ghost" data-action="live">Live Orders</button>
					<button class="bz-btn bz-btn-solid" data-action="refresh">
						<span class="bz-refresh-dot"></span>Refresh
					</button>
				</div>
			</header>

			<section class="bz-kpi-grid">
				<div class="bz-kpi bz-kpi-lg" data-card="revenue">
					<div class="bz-kpi-head">
						<span class="bz-kpi-label">Today's Revenue</span>
						<span class="bz-kpi-icon bz-ic-rev">₹</span>
					</div>
					<div class="bz-kpi-value" data-v="today_revenue">₹0</div>
					<div class="bz-kpi-foot">
						<span class="bz-chip-green" data-v="today_orders">0 orders</span>
						<span class="bz-muted" data-v="avg_ticket">avg ₹0</span>
					</div>
				</div>

				<div class="bz-kpi" data-card="range">
					<div class="bz-kpi-head">
						<span class="bz-kpi-label" data-v="range_label">7-day Revenue</span>
						<span class="bz-kpi-icon bz-ic-range">↗</span>
					</div>
					<div class="bz-kpi-value" data-v="range_revenue">₹0</div>
					<div class="bz-kpi-foot">
						<span class="bz-muted" data-v="range_orders">0 orders</span>
					</div>
				</div>

				<div class="bz-kpi" data-card="active">
					<div class="bz-kpi-head">
						<span class="bz-kpi-label">Active Orders</span>
						<span class="bz-kpi-icon bz-ic-active">◉</span>
					</div>
					<div class="bz-kpi-value" data-v="active_orders">0</div>
					<div class="bz-kpi-foot">
						<span class="bz-chip-amber" data-v="unpaid_orders">0 unpaid</span>
					</div>
				</div>

				<div class="bz-kpi" data-card="kitchen">
					<div class="bz-kpi-head">
						<span class="bz-kpi-label">Kitchen Queue</span>
						<span class="bz-kpi-icon bz-ic-kitchen">◎</span>
					</div>
					<div class="bz-kpi-value" data-v="kitchen_queue">0</div>
					<div class="bz-kpi-foot">
						<span class="bz-muted">pending &amp; in progress</span>
					</div>
				</div>

				<div class="bz-kpi" data-card="tables">
					<div class="bz-kpi-head">
						<span class="bz-kpi-label">Tables</span>
						<span class="bz-kpi-icon bz-ic-tables">□</span>
					</div>
					<div class="bz-kpi-value" data-v="tables_occupied">0</div>
					<div class="bz-kpi-foot">
						<span class="bz-muted" data-v="tables_available">0 free</span>
					</div>
				</div>
			</section>

			<section class="bz-row">
				<div class="bz-panel bz-panel-wide">
					<div class="bz-panel-head">
						<div>
							<h3>Revenue Trend</h3>
							<p class="bz-muted">Sales across the selected range</p>
						</div>
					</div>
					<div class="bz-chart" data-chart="range"></div>
				</div>

				<div class="bz-panel">
					<div class="bz-panel-head">
						<div>
							<h3>Payment Mix</h3>
							<p class="bz-muted">Today's payment methods</p>
						</div>
					</div>
					<div class="bz-chart" data-chart="payment"></div>
					<div class="bz-legend" data-legend="payment"></div>
				</div>
			</section>

			<section class="bz-row">
				<div class="bz-panel">
					<div class="bz-panel-head">
						<div>
							<h3>Hourly Sales — Today</h3>
							<p class="bz-muted">Revenue by hour</p>
						</div>
					</div>
					<div class="bz-chart" data-chart="hourly"></div>
				</div>

				<div class="bz-panel">
					<div class="bz-panel-head">
						<div>
							<h3>Top Menu Items</h3>
							<p class="bz-muted">Highest grossing</p>
						</div>
					</div>
					<div class="bz-list" data-list="top-items"></div>
				</div>
			</section>

			<section class="bz-row">
				<div class="bz-panel">
					<div class="bz-panel-head">
						<div>
							<h3>Order Mix</h3>
							<p class="bz-muted">Dine-in vs Takeaway</p>
						</div>
					</div>
					<div class="bz-split" data-split="mix"></div>
				</div>

				<div class="bz-panel">
					<div class="bz-panel-head">
						<div>
							<h3>Kitchen Load</h3>
							<p class="bz-muted">Pending items per station</p>
						</div>
					</div>
					<div class="bz-list" data-list="kitchen"></div>
				</div>

				<div class="bz-panel">
					<div class="bz-panel-head">
						<div>
							<h3>Low Stock Alerts</h3>
							<p class="bz-muted">Below reorder level</p>
						</div>
					</div>
					<div class="bz-list" data-list="low-stock"></div>
				</div>
			</section>

			<section class="bz-row">
				<div class="bz-panel bz-panel-wide">
					<div class="bz-panel-head">
						<div>
							<h3>Recent Orders</h3>
							<p class="bz-muted">Latest 8 submitted orders</p>
						</div>
					</div>
					<div class="bz-table-wrap">
						<table class="bz-table">
							<thead>
								<tr>
									<th>Order</th>
									<th>Customer</th>
									<th>Type</th>
									<th>Status</th>
									<th>Payment</th>
									<th class="bz-text-right">Total</th>
								</tr>
							</thead>
							<tbody data-list="recent"></tbody>
						</table>
					</div>
				</div>
			</section>
		</div>
	`);

	const money = (v) => `₹${Number(v || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

	function bindEvents() {
		$wrapper.on("click", "[data-action='refresh']", () => loadData());
		$wrapper.on("click", "[data-action='pos']", () => frappe.set_route("billing-dashboard"));
		$wrapper.on("click", "[data-action='live']", () => frappe.set_route("live-orders"));
		$wrapper.on("click", ".bz-range-btn", function () {
			$wrapper.find(".bz-range-btn").removeClass("active");
			$(this).addClass("active");
			state.range = parseInt($(this).data("range"), 10);
			loadData();
		});
	}

	function loadData() {
		$wrapper.find("[data-generated]").text("Refreshing…");
		frappe.call({
			method: "billing_management.billing.page.billing_analytics.billing_analytics.get_overview",
			args: { range_days: state.range },
			callback: (r) => {
				if (!r || !r.message) return;
				state.data = r.message;
				render();
			},
		});
	}

	function render() {
		const d = state.data;
		const k = d.kpis;

		// KPI values
		$wrapper.find("[data-v='today_revenue']").text(money(k.today_revenue));
		$wrapper.find("[data-v='today_orders']").text(`${k.today_orders} orders`);
		$wrapper.find("[data-v='avg_ticket']").text(`avg ${money(k.avg_ticket)}`);
		$wrapper.find("[data-v='range_label']").text(`${d.range_days}-day Revenue`);
		$wrapper.find("[data-v='range_revenue']").text(money(k.range_revenue));
		$wrapper.find("[data-v='range_orders']").text(`${k.range_orders} orders`);
		$wrapper.find("[data-v='active_orders']").text(k.active_orders);
		$wrapper.find("[data-v='unpaid_orders']").text(`${k.unpaid_orders} unpaid`);
		$wrapper.find("[data-v='kitchen_queue']").text(k.kitchen_queue);
		$wrapper.find("[data-v='tables_occupied']").text(k.tables_occupied);
		$wrapper.find("[data-v='tables_available']").text(`${k.tables_available} free`);

		$wrapper.find("[data-generated]").text(
			`Last refreshed ${frappe.datetime.comment_when(d.generated_at)}`,
		);

		renderRangeChart(d.range_sales);
		renderPaymentChart(d.payment_breakdown);
		renderHourlyChart(d.hourly_sales);
		renderTopItems(d.top_items);
		renderOrderMix(d.order_mix);
		renderKitchenLoad(d.kitchen_load);
		renderLowStock(d.low_stock);
		renderRecentOrders(d.recent_orders);
	}

	function destroyChart(key) {
		if (state.charts[key] && typeof state.charts[key].destroy === "function") {
			try { state.charts[key].destroy(); } catch (e) {}
		}
		state.charts[key] = null;
	}

	function renderRangeChart(series) {
		const el = $wrapper.find("[data-chart='range']")[0];
		if (!el || !window.frappe || !frappe.Chart) return;
		el.innerHTML = "";
		destroyChart("range");
		state.charts.range = new frappe.Chart(el, {
			title: "",
			data: {
				labels: series.labels,
				datasets: [
					{ name: "Revenue", values: series.revenue, chartType: "line" },
				],
			},
			type: "line",
			height: 260,
			colors: ["#6366f1"],
			lineOptions: { regionFill: 1, hideDots: 0, spline: 1 },
			axisOptions: { xAxisMode: "tick" },
		});
	}

	function renderHourlyChart(series) {
		const el = $wrapper.find("[data-chart='hourly']")[0];
		if (!el || !frappe.Chart) return;
		el.innerHTML = "";
		destroyChart("hourly");
		state.charts.hourly = new frappe.Chart(el, {
			data: {
				labels: series.labels,
				datasets: [{ name: "Revenue", values: series.revenue, chartType: "bar" }],
			},
			type: "bar",
			height: 240,
			colors: ["#10b981"],
			barOptions: { spaceRatio: 0.4 },
		});
	}

	function renderPaymentChart(rows) {
		const el = $wrapper.find("[data-chart='payment']")[0];
		const legend = $wrapper.find("[data-legend='payment']");
		legend.empty();
		if (!el || !frappe.Chart) return;
		el.innerHTML = "";
		destroyChart("payment");

		if (!rows || !rows.length) {
			el.innerHTML = `<div class="bz-empty">No payments today</div>`;
			return;
		}
		const labels = rows.map((r) => r.payment_method);
		const values = rows.map((r) => r.total);
		const colors = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#06b6d4", "#a855f7"];

		state.charts.payment = new frappe.Chart(el, {
			data: { labels, datasets: [{ values }] },
			type: "donut",
			height: 220,
			colors,
		});
		rows.forEach((r, i) => {
			legend.append(`
				<div class="bz-legend-item">
					<span class="bz-legend-dot" style="background:${colors[i % colors.length]}"></span>
					<span class="bz-legend-label">${frappe.utils.escape_html(r.payment_method)}</span>
					<span class="bz-legend-value">${money(r.total)}</span>
				</div>
			`);
		});
	}

	function renderTopItems(items) {
		const root = $wrapper.find("[data-list='top-items']").empty();
		if (!items || !items.length) {
			root.append(`<div class="bz-empty">No sales yet</div>`);
			return;
		}
		const max = Math.max.apply(null, items.map((i) => i.amount || 0));
		items.forEach((it, idx) => {
			const pct = max ? Math.round(((it.amount || 0) / max) * 100) : 0;
			root.append(`
				<div class="bz-rankrow">
					<div class="bz-rank">#${idx + 1}</div>
					<div class="bz-rankbody">
						<div class="bz-rankline">
							<span class="bz-rankname">${frappe.utils.escape_html(it.item_name || it.item)}</span>
							<span class="bz-rankamt">${money(it.amount)}</span>
						</div>
						<div class="bz-rankbar"><span style="width:${pct}%"></span></div>
						<div class="bz-rankmeta">Qty ${Number(it.qty || 0).toFixed(0)}</div>
					</div>
				</div>
			`);
		});
	}

	function renderOrderMix(rows) {
		const root = $wrapper.find("[data-split='mix']").empty();
		if (!rows || !rows.length) {
			root.append(`<div class="bz-empty">No orders in range</div>`);
			return;
		}
		const total = rows.reduce((a, r) => a + (r.orders || 0), 0) || 1;
		rows.forEach((r) => {
			const pct = Math.round(((r.orders || 0) / total) * 100);
			const color = r.order_type === "Dine-In" ? "#6366f1" : "#10b981";
			root.append(`
				<div class="bz-splitrow">
					<div class="bz-splitline">
						<span class="bz-splitname" style="color:${color}">● ${frappe.utils.escape_html(r.order_type || "—")}</span>
						<span>${r.orders} orders · ${money(r.total)}</span>
					</div>
					<div class="bz-splitbar"><span style="width:${pct}%;background:${color}"></span></div>
					<div class="bz-splitpct">${pct}%</div>
				</div>
			`);
		});
	}

	function renderKitchenLoad(rows) {
		const root = $wrapper.find("[data-list='kitchen']").empty();
		if (!rows || !rows.length) {
			root.append(`<div class="bz-empty">No active stations</div>`);
			return;
		}
		rows.forEach((r) => {
			const load = Math.min(100, (r.pending || 0) * 10);
			const tone = r.pending >= 5 ? "danger" : r.pending >= 2 ? "warn" : "ok";
			root.append(`
				<div class="bz-stationrow">
					<div class="bz-stationname">${frappe.utils.escape_html(r.label || r.station)}</div>
					<div class="bz-stationbar bz-tone-${tone}"><span style="width:${load}%"></span></div>
					<div class="bz-stationpending">${r.pending}</div>
				</div>
			`);
		});
	}

	function renderLowStock(rows) {
		const root = $wrapper.find("[data-list='low-stock']").empty();
		if (!rows || !rows.length) {
			root.append(`<div class="bz-empty bz-empty-ok">All items above reorder level ✓</div>`);
			return;
		}
		rows.forEach((r) => {
			const deficit = Math.max((r.reorder_level || 0) - (r.balance_qty || 0), 0);
			root.append(`
				<div class="bz-stockrow">
					<div>
						<div class="bz-stockname">${frappe.utils.escape_html(r.item_name || r.item)}</div>
						<div class="bz-muted">reorder @ ${r.reorder_level}</div>
					</div>
					<div class="bz-stockqty">${Number(r.balance_qty || 0).toFixed(1)}</div>
					<div class="bz-stockdelta">-${Number(deficit).toFixed(1)}</div>
				</div>
			`);
		});
	}

	function renderRecentOrders(rows) {
		const body = $wrapper.find("[data-list='recent']").empty();
		if (!rows || !rows.length) {
			body.append(`<tr><td colspan="6" class="bz-empty">No recent orders</td></tr>`);
			return;
		}
		rows.forEach((o) => {
			const statusClass = {
				Pending: "bz-tag-amber",
				Preparing: "bz-tag-blue",
				Ready: "bz-tag-green",
				Served: "bz-tag-gray",
				"Picked Up": "bz-tag-gray",
			}[o.order_status] || "bz-tag-gray";
			const payClass = o.payment_status === "Paid" ? "bz-tag-green" : "bz-tag-amber";
			body.append(`
				<tr>
					<td><a href="/app/pos-order/${o.name}">${o.name}</a></td>
					<td>${frappe.utils.escape_html(o.customer_name || "—")}</td>
					<td>${o.order_type || "—"}${o.table_no ? ` · ${o.table_no}` : ""}</td>
					<td><span class="bz-tag ${statusClass}">${o.order_status || "—"}</span></td>
					<td><span class="bz-tag ${payClass}">${o.payment_status || "—"}</span></td>
					<td class="bz-text-right">${money(o.grand_total)}</td>
				</tr>
			`);
		});
	}

	bindEvents();
	loadData();

	if (state.autoRefresh) clearInterval(state.autoRefresh);
	state.autoRefresh = setInterval(loadData, 60000);
};
