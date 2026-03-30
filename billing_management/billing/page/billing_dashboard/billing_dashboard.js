frappe.pages["billing-dashboard"].on_page_load = function (wrapper) {
	const state = {
		items: [],
		cart: {},
		cart_order: [],
		context: { tables: [], stats: {} },
		order_type: "Dine-In",
		billing_mode: "Pay Later",
		discount_percentage: 0,
		service_charge: 0,
	};

	const $wrapper = $(wrapper);
	$wrapper.html(`
		<div class="restaurant-pos-shell">
			<div class="restaurant-pos-header">
				<div>
					<div class="restaurant-pos-eyebrow">Restaurant Billing System</div>
					<h1>Restaurant POS Command Center</h1>
					<p>Run dine-in and takeaway orders from one clean billing dashboard.</p>
				</div>
				<div class="restaurant-pos-header-actions">
					<button class="btn btn-light btn-sm restaurant-open-live">Live Orders</button>
					<button class="btn btn-light btn-sm restaurant-refresh">Refresh</button>
				</div>
			</div>

			<div class="restaurant-stat-grid">
				<div class="restaurant-stat-card"><span>Active Orders</span><strong data-stat="active_orders">0</strong></div>
				<div class="restaurant-stat-card"><span>Kitchen Queue</span><strong data-stat="kitchen_queue">0</strong></div>
				<div class="restaurant-stat-card"><span>Unpaid Orders</span><strong data-stat="unpaid_orders">0</strong></div>
				<div class="restaurant-stat-card"><span>Available Tables</span><strong data-stat="available_tables">0</strong></div>
			</div>

			<div class="restaurant-pos-grid">
				<section class="restaurant-panel restaurant-panel-menu">
					<div class="restaurant-panel-head">
						<div>
							<h3>Menu</h3>
							<p>Search and add items quickly</p>
						</div>
						<button class="btn btn-default btn-sm restaurant-add-item">New Item</button>
					</div>
					<div class="restaurant-search-row">
						<input class="form-control restaurant-item-search" placeholder="Search menu items" />
					</div>
					<div class="restaurant-menu-grid"></div>
				</section>

				<section class="restaurant-panel restaurant-panel-order">
					<div class="restaurant-panel-head">
						<div>
							<h3>Order Builder</h3>
							<p>Choose service mode, billing flow, and order details</p>
						</div>
					</div>

					<div class="restaurant-mode-block">
						<label>Service Mode</label>
						<div class="restaurant-chip-group" data-role="order_type">
							<button class="restaurant-chip active" data-value="Dine-In">Dine-In</button>
							<button class="restaurant-chip" data-value="Takeaway">Takeaway</button>
						</div>
					</div>

					<div class="restaurant-mode-block">
						<label>Billing Mode</label>
						<div class="restaurant-chip-group" data-role="billing_mode">
							<button class="restaurant-chip" data-value="Pay Now">Pay Now</button>
							<button class="restaurant-chip active" data-value="Pay Later">Pay Later</button>
						</div>
					</div>

					<div class="restaurant-form-grid">
						<div class="restaurant-field" data-field="table_wrap">
							<label>Table</label>
							<select class="form-control restaurant-table-select"></select>
						</div>
						<div class="restaurant-field" data-field="token_wrap" style="display:none;">
							<label>Takeaway Token</label>
							<div class="restaurant-token-preview">Generated after saving order</div>
						</div>
						<div class="restaurant-field">
							<label>Customer Name</label>
							<input class="form-control restaurant-customer-name" placeholder="Walk-in Customer" />
						</div>
						<div class="restaurant-field">
							<label>Mobile Number</label>
							<input class="form-control restaurant-mobile-no" placeholder="Optional" />
						</div>
						<div class="restaurant-field">
							<label>Discount %</label>
							<input type="number" min="0" max="100" step="0.01" class="form-control restaurant-discount" value="0" />
						</div>
						<div class="restaurant-field" data-field="service_charge_wrap">
							<label>Service Charge</label>
							<input type="number" min="0" step="0.01" class="form-control restaurant-service-charge" value="0" />
						</div>
					</div>

					<div class="restaurant-field restaurant-full-width">
						<label>Order Notes</label>
						<textarea class="form-control restaurant-remarks" rows="3" placeholder="Special notes for the order"></textarea>
					</div>

					<div class="restaurant-cart-list"></div>

					<div class="restaurant-summary-grid">
						<div><span>Subtotal</span><strong data-total="subtotal">0</strong></div>
						<div><span>Discount</span><strong data-total="discount">0</strong></div>
						<div><span>Service Charge</span><strong data-total="service_charge">0</strong></div>
						<div class="restaurant-grand"><span>Grand Total</span><strong data-total="grand_total">0</strong></div>
					</div>

					<div class="restaurant-action-row">
						<button class="btn btn-default restaurant-clear-cart">Clear</button>
						<button class="btn btn-primary restaurant-submit-order">Save Unpaid Order</button>
					</div>
				</section>
			</div>
		</div>
	`);

	if (!document.getElementById("restaurant-pos-style")) {
		const style = document.createElement("style");
		style.id = "restaurant-pos-style";
		style.innerHTML = `
			.restaurant-pos-shell { padding: 18px; background: #f5f7fb; min-height: 100%; }
			.restaurant-pos-header {
				display:flex; justify-content:space-between; align-items:flex-start; gap:16px;
				padding:24px; border-radius:24px; margin-bottom:18px;
				background: radial-gradient(circle at top left, #6f7bf7, #3a44c3 55%, #1f2c7a 100%);
				color:#fff; box-shadow:0 20px 45px rgba(47, 63, 147, 0.22);
			}
			.restaurant-pos-eyebrow { text-transform:uppercase; letter-spacing:.12em; font-size:11px; opacity:.8; margin-bottom:8px; }
			.restaurant-pos-header h1 { margin:0; font-size:30px; font-weight:700; }
			.restaurant-pos-header p { margin:8px 0 0; opacity:.9; }
			.restaurant-pos-header-actions { display:flex; gap:10px; }
			.restaurant-pos-header-actions .btn { border:none; border-radius:12px; padding:10px 14px; font-weight:600; }
			.restaurant-stat-grid { display:grid; grid-template-columns:repeat(4, minmax(0, 1fr)); gap:14px; margin-bottom:18px; }
			.restaurant-stat-card {
				background:#fff; border:1px solid #e6ebf5; border-radius:18px; padding:16px 18px;
				box-shadow:0 8px 20px rgba(30, 41, 59, 0.06); display:flex; flex-direction:column; gap:8px;
			}
			.restaurant-stat-card span { color:#64748b; font-size:13px; }
			.restaurant-stat-card strong { color:#0f172a; font-size:28px; }
			.restaurant-pos-grid { display:grid; grid-template-columns:1.2fr .95fr; gap:18px; }
			.restaurant-panel {
				background:#fff; border:1px solid #e7ecf4; border-radius:24px; padding:20px;
				box-shadow:0 12px 32px rgba(15, 23, 42, 0.06);
			}
			.restaurant-panel-head { display:flex; justify-content:space-between; align-items:flex-start; gap:12px; margin-bottom:16px; }
			.restaurant-panel-head h3 { margin:0; font-size:22px; font-weight:700; color:#0f172a; }
			.restaurant-panel-head p { margin:4px 0 0; color:#64748b; font-size:13px; }
			.restaurant-search-row { margin-bottom:16px; }
			.restaurant-item-search, .restaurant-table-select, .restaurant-customer-name, .restaurant-mobile-no,
			.restaurant-discount, .restaurant-service-charge, .restaurant-remarks {
				border-radius:14px !important; border:1px solid #d9e1ef !important; min-height:44px;
			}
			.restaurant-menu-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(180px, 1fr)); gap:14px; max-height:72vh; overflow:auto; }
			.restaurant-menu-card {
				border:1px solid #e8edf5; border-radius:18px; padding:16px; cursor:pointer; background:linear-gradient(180deg, #fff, #fbfcff);
				transition:transform .18s ease, box-shadow .18s ease, border-color .18s ease;
			}
			.restaurant-menu-card:hover { transform:translateY(-2px); border-color:#c7d4f9; box-shadow:0 10px 24px rgba(88, 99, 226, .12); }
			.restaurant-menu-card.out { opacity:.58; cursor:not-allowed; }
			.restaurant-menu-card .meta { color:#64748b; font-size:12px; margin-top:6px; }
			.restaurant-menu-card .price { font-size:20px; color:#1d4ed8; font-weight:700; margin-top:14px; }
			.restaurant-stock { display:inline-flex; margin-top:12px; padding:4px 10px; border-radius:999px; font-size:12px; font-weight:600; background:#eef4ff; color:#3557d7; }
			.restaurant-stock.out { background:#ffeaea; color:#c2410c; }
			.restaurant-mode-block { margin-bottom:14px; }
			.restaurant-mode-block label, .restaurant-field label { display:block; color:#475569; font-size:12px; font-weight:700; margin-bottom:8px; text-transform:uppercase; letter-spacing:.04em; }
			.restaurant-chip-group { display:flex; gap:10px; flex-wrap:wrap; }
			.restaurant-chip {
				border:1px solid #d7dfef; background:#f8fafc; color:#334155; border-radius:999px; padding:10px 16px; font-weight:700;
			}
			.restaurant-chip.active { background:linear-gradient(135deg, #4f46e5, #2563eb); color:#fff; border-color:transparent; }
			.restaurant-form-grid { display:grid; grid-template-columns:repeat(2, minmax(0, 1fr)); gap:14px; margin-bottom:14px; }
			.restaurant-token-preview {
				min-height:44px; border-radius:14px; border:1px dashed #ced8f0; display:flex; align-items:center; padding:0 14px; color:#4338ca; background:#f8f8ff;
			}
			.restaurant-full-width { margin-bottom:14px; }
			.restaurant-cart-list { min-height:160px; max-height:34vh; overflow:auto; display:flex; flex-direction:column; gap:10px; margin-bottom:16px; }
			.restaurant-empty-cart { padding:24px; border:1px dashed #d9e1ef; border-radius:18px; text-align:center; color:#64748b; background:#fafcff; }
			.restaurant-cart-row { display:grid; grid-template-columns:1fr auto auto; gap:10px; align-items:center; border:1px solid #e7ecf4; border-radius:18px; padding:12px 14px; }
			.restaurant-cart-row .name { font-weight:700; color:#0f172a; }
			.restaurant-cart-row .meta { color:#64748b; font-size:12px; }
			.restaurant-qty-box { display:flex; align-items:center; gap:8px; }
			.restaurant-qty-box button { border:none; width:32px; height:32px; border-radius:10px; background:#eef2ff; color:#3730a3; font-weight:700; }
			.restaurant-qty-box input { width:64px; text-align:center; border-radius:12px; border:1px solid #d8e0f0; height:36px; }
			.restaurant-row-amount { text-align:right; }
			.restaurant-row-amount strong { display:block; font-size:16px; color:#0f172a; }
			.restaurant-row-amount button { border:none; background:none; color:#dc2626; padding:0; font-size:12px; }
			.restaurant-summary-grid { display:grid; grid-template-columns:repeat(2, minmax(0, 1fr)); gap:12px; margin-bottom:16px; }
			.restaurant-summary-grid div { background:#f8fafc; border:1px solid #e4eaf5; border-radius:18px; padding:14px 16px; }
			.restaurant-summary-grid span { display:block; color:#64748b; font-size:12px; margin-bottom:4px; }
			.restaurant-summary-grid strong { font-size:20px; color:#0f172a; }
			.restaurant-summary-grid .restaurant-grand { background:linear-gradient(135deg, #0f766e, #0f9b7a); border:none; }
			.restaurant-summary-grid .restaurant-grand span, .restaurant-summary-grid .restaurant-grand strong { color:#fff; }
			.restaurant-action-row { display:flex; justify-content:flex-end; gap:12px; }
			.restaurant-action-row .btn { min-width:140px; border-radius:14px; height:44px; font-weight:700; }
			@media (max-width: 1200px) { .restaurant-pos-grid { grid-template-columns:1fr; } .restaurant-stat-grid { grid-template-columns:repeat(2, minmax(0, 1fr)); } }
			@media (max-width: 768px) {
				.restaurant-pos-shell { padding:12px; }
				.restaurant-pos-header { flex-direction:column; border-radius:20px; }
				.restaurant-stat-grid, .restaurant-form-grid, .restaurant-summary-grid { grid-template-columns:1fr; }
				.restaurant-action-row { flex-direction:column; }
			}
		`;
		document.head.appendChild(style);
	}

	const $menuGrid = $wrapper.find(".restaurant-menu-grid");
	const $cartList = $wrapper.find(".restaurant-cart-list");
	const $search = $wrapper.find(".restaurant-item-search");
	const $tableSelect = $wrapper.find(".restaurant-table-select");
	const $discount = $wrapper.find(".restaurant-discount");
	const $serviceCharge = $wrapper.find(".restaurant-service-charge");
	const $submit = $wrapper.find(".restaurant-submit-order");

	const currencyCode =
		(frappe.defaults && frappe.defaults.get_default && frappe.defaults.get_default("currency")) || "INR";

	function formatMoney(value) {
		return typeof format_currency === "function" ? format_currency(flt(value), currencyCode) : `₹ ${flt(value)}`;
	}

	function calculateTotals() {
		const subtotal = state.cart_order.reduce((sum, code) => {
			const row = state.cart[code];
			return sum + (row ? flt(row.qty) * flt(row.rate) : 0);
		}, 0);
		const discountAmount = subtotal * ((flt(state.discount_percentage) || 0) / 100);
		const serviceCharge = state.order_type === "Dine-In" ? flt(state.service_charge) || 0 : 0;
		const grandTotal = subtotal - discountAmount + serviceCharge;
		return { subtotal, discountAmount, serviceCharge, grandTotal };
	}

	function renderTotals() {
		const totals = calculateTotals();
		$wrapper.find('[data-total="subtotal"]').text(formatMoney(totals.subtotal));
		$wrapper.find('[data-total="discount"]').text(`-${formatMoney(totals.discountAmount)}`);
		$wrapper.find('[data-total="service_charge"]').text(formatMoney(totals.serviceCharge));
		$wrapper.find('[data-total="grand_total"]').text(formatMoney(totals.grandTotal));
	}

	function renderStats() {
		const stats = state.context.stats || {};
		["active_orders", "kitchen_queue", "unpaid_orders", "available_tables"].forEach((key) => {
			$wrapper.find(`[data-stat="${key}"]`).text(stats[key] || 0);
		});
	}

	function renderTableOptions() {
		const tables = state.context.tables || [];
		const options = ['<option value="">Select table</option>']
			.concat(
				tables.map((table) => {
					const occupied = cint(table.is_available) ? "Available" : "Occupied";
					const disabled = cint(table.is_available) ? "" : "disabled";
					return `<option value="${frappe.utils.escape_html(table.name)}" ${disabled}>${frappe.utils.escape_html(table.table_name)} • ${occupied}</option>`;
				})
			)
			.join("");
		$tableSelect.html(options);
	}

	function renderItems() {
		$menuGrid.empty();
		if (!state.items.length) {
			$menuGrid.html('<div class="restaurant-empty-cart">No items found.</div>');
			return;
		}

		state.items.forEach((item) => {
			const isOut = flt(item.available_qty) <= 0;
			const stockClass = isOut ? "out" : "";
			const card = $(
				`<div class="restaurant-menu-card ${stockClass}">
					<div class="title">${frappe.utils.escape_html(item.item_name)}</div>
					<div class="meta">${frappe.utils.escape_html(item.item_category || "Menu Item")} • ${frappe.utils.escape_html(item.food_type || "Kitchen")}</div>
					<div class="price">${formatMoney(item.rate)}</div>
					<div class="stock ${stockClass ? "out" : ""}">${isOut ? "Out of Stock" : `Available ${flt(item.available_qty)}`}</div>
				</div>`
			);
			card.find(".stock").addClass("restaurant-stock");
			card.on("click", () => {
				if (!isOut) addToCart(item);
			});
			$menuGrid.append(card);
		});
	}

	function renderCart() {
		$cartList.empty();
		if (!state.cart_order.length) {
			$cartList.html('<div class="restaurant-empty-cart">Add menu items to start a new order.</div>');
			renderTotals();
			return;
		}

		state.cart_order.forEach((code) => {
			const row = state.cart[code];
			if (!row) return;
			const entry = $(
				`<div class="restaurant-cart-row">
					<div>
						<div class="name">${frappe.utils.escape_html(row.item_name)}</div>
						<div class="meta">${formatMoney(row.rate)} each</div>
					</div>
					<div class="restaurant-qty-box">
						<button data-action="minus">-</button>
						<input type="number" min="1" value="${flt(row.qty)}" />
						<button data-action="plus">+</button>
					</div>
					<div class="restaurant-row-amount">
						<strong>${formatMoney(flt(row.qty) * flt(row.rate))}</strong>
						<button type="button">Remove</button>
					</div>
				</div>`
			);
			entry.find('[data-action="minus"]').on("click", () => updateQty(code, row.qty - 1));
			entry.find('[data-action="plus"]').on("click", () => updateQty(code, row.qty + 1));
			entry.find("input").on("change", (e) => updateQty(code, flt(e.target.value) || 1));
			entry.find(".restaurant-row-amount button").on("click", () => removeFromCart(code));
			$cartList.append(entry);
		});

		renderTotals();
	}

	function addToCart(item) {
		const code = item.item_code;
		if (!state.cart[code]) {
			state.cart[code] = {
				item_code: item.item_code,
				item_name: item.item_name,
				qty: 1,
				rate: flt(item.rate),
				warehouse: item.warehouse,
				available_qty: flt(item.available_qty),
				send_to_kitchen: 1,
			};
			state.cart_order.push(code);
		} else if (flt(state.cart[code].qty) < flt(state.cart[code].available_qty)) {
			state.cart[code].qty += 1;
		}
		renderCart();
	}

	function updateQty(code, qty) {
		const row = state.cart[code];
		if (!row) return;
		qty = Math.max(1, flt(qty));
		if (flt(row.available_qty) && qty > flt(row.available_qty)) {
			frappe.msgprint(__("Only {0} units available for {1}", [row.available_qty, row.item_name]));
			qty = row.available_qty;
		}
		row.qty = qty;
		renderCart();
	}

	function removeFromCart(code) {
		delete state.cart[code];
		state.cart_order = state.cart_order.filter((entry) => entry !== code);
		renderCart();
	}

	function toggleMode(role, value) {
		state[role] = value;
		$wrapper.find(`.restaurant-chip-group[data-role="${role}"] .restaurant-chip`).removeClass("active");
		$wrapper.find(`.restaurant-chip-group[data-role="${role}"] .restaurant-chip[data-value="${value}"]`).addClass("active");

		const dineIn = state.order_type === "Dine-In";
		$wrapper.find('[data-field="table_wrap"]').toggle(dineIn);
		$wrapper.find('[data-field="service_charge_wrap"]').toggle(dineIn);
		$wrapper.find('[data-field="token_wrap"]').toggle(!dineIn);
		if (!dineIn) {
			$tableSelect.val("");
			$serviceCharge.val(0);
			state.service_charge = 0;
		}

		$submit.text(state.billing_mode === "Pay Now" ? "Pay & Generate Bill" : "Save Unpaid Order");
		renderTotals();
	}

	function getPayload(paymentValues) {
		const totals = calculateTotals();
		return {
			order_type: state.order_type,
			billing_mode: state.billing_mode,
			table_no: $tableSelect.val(),
			customer_name: $wrapper.find(".restaurant-customer-name").val(),
			mobile_no: $wrapper.find(".restaurant-mobile-no").val(),
			discount_percentage: flt(state.discount_percentage),
			service_charge: state.order_type === "Dine-In" ? flt(state.service_charge) : 0,
			remarks: $wrapper.find(".restaurant-remarks").val(),
			payment_method: paymentValues ? paymentValues.payment_method : null,
			payment_amount: paymentValues ? paymentValues.payment_amount : 0,
			items: state.cart_order.map((code) => ({
				item_code: state.cart[code].item_code,
				qty: state.cart[code].qty,
				rate: state.cart[code].rate,
				warehouse: state.cart[code].warehouse,
				send_to_kitchen: state.cart[code].send_to_kitchen,
			})),
			grand_total: totals.grandTotal,
		};
	}

	function resetOrder() {
		state.cart = {};
		state.cart_order = [];
		state.discount_percentage = 0;
		state.service_charge = 0;
		$discount.val(0);
		$serviceCharge.val(0);
		$wrapper.find(".restaurant-customer-name, .restaurant-mobile-no, .restaurant-remarks").val("");
		$tableSelect.val("");
		renderCart();
	}

	function submitOrder(paymentValues) {
		const payload = getPayload(paymentValues);
		if (!payload.items.length) {
			frappe.msgprint(__("Add at least one item to continue"));
			return;
		}
		if (payload.order_type === "Dine-In" && !payload.table_no) {
			frappe.msgprint(__("Select a table for Dine-In orders"));
			return;
		}

		frappe.call({
			method: "billing_management.billing.pos.billing_pos.create_pos_order",
			args: payload,
			freeze: true,
			freeze_message: __("Processing restaurant order..."),
			callback(r) {
				if (r.exc) return;
				const message = r.message || {};
				frappe.show_alert({
					message: message.invoice_name
						? __("Order {0} billed successfully", [message.order_name])
						: __("Order {0} saved successfully", [message.order_name]),
					indicator: "green",
				});
				if (message.takeaway_token) {
					$wrapper.find(".restaurant-token-preview").text(message.takeaway_token);
				}
				resetOrder();
				loadContext();
				if (message.invoice_name) {
					frappe.set_route("Form", "Billing Invoice", message.invoice_name);
				}
			}
		});
	}

	function openPaymentDialog() {
		const totals = calculateTotals();
		if (totals.grandTotal <= 0) {
			frappe.msgprint(__("Grand total must be greater than zero"));
			return;
		}

		const dialog = new frappe.ui.Dialog({
			title: __("Collect Payment"),
			fields: [
				{ fieldtype: "HTML", fieldname: "summary", options: `<div style="padding:12px 14px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;"><div style="display:flex;justify-content:space-between;"><span>Total</span><strong>${formatMoney(totals.grandTotal)}</strong></div></div>` },
				{ fieldtype: "Select", fieldname: "payment_method", label: __("Payment Method"), options: "Cash\nCard\nUPI\nWallet\nNet Banking\nCredit", default: "Cash", reqd: 1 },
				{ fieldtype: "Float", fieldname: "payment_amount", label: __("Amount Received"), default: totals.grandTotal, reqd: 1 },
			],
			primary_action_label: __("Confirm Payment"),
			primary_action(values) {
				dialog.hide();
				submitOrder(values);
			},
		});
		dialog.show();
	}

	function loadItems(searchText) {
		return frappe.call({
			method: "billing_management.billing.pos.billing_pos.get_pos_items",
			args: { search: searchText || "" },
		}).then((r) => {
			state.items = r.message || [];
			renderItems();
		});
	}

	function loadContext() {
		return frappe.call({
			method: "billing_management.billing.pos.billing_pos.get_restaurant_pos_context",
		}).then((r) => {
			state.context = r.message || { tables: [], stats: {} };
			renderStats();
			renderTableOptions();
		});
	}

	$wrapper.find(".restaurant-chip-group .restaurant-chip").on("click", function () {
		const $button = $(this);
		toggleMode($button.closest(".restaurant-chip-group").data("role"), $button.data("value"));
	});
	$search.on("input", frappe.utils.debounce(() => loadItems($search.val()), 250));
	$discount.on("input", () => {
		state.discount_percentage = Math.max(0, Math.min(100, flt($discount.val()) || 0));
		renderTotals();
	});
	$serviceCharge.on("input", () => {
		state.service_charge = Math.max(0, flt($serviceCharge.val()) || 0);
		renderTotals();
	});
	$wrapper.find(".restaurant-refresh").on("click", () => {
		loadContext();
		loadItems($search.val());
	});
	$wrapper.find(".restaurant-open-live").on("click", () => frappe.set_route("live-orders"));
	$wrapper.find(".restaurant-add-item").on("click", () => frappe.new_doc("Billing Item"));
	$wrapper.find(".restaurant-clear-cart").on("click", resetOrder);
	$submit.on("click", () => {
		if (state.billing_mode === "Pay Now") {
			openPaymentDialog();
		} else {
			submitOrder(null);
		}
	});

	toggleMode("order_type", state.order_type);
	toggleMode("billing_mode", state.billing_mode);
	loadContext();
	loadItems("");
	renderCart();
};
