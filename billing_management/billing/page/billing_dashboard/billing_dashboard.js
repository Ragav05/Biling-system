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
		<div class="modern-pos">
			<header class="mod-header">
				<div class="mod-logo">🍽️ <span>POS</span></div>
				<div class="mod-actions">
					<button class="mod-btn" onclick="frappe.set_route(\"live-orders\")">📋 Live Orders</button>
					<button class="mod-btn" onclick="location.reload()">🔄 Refresh</button>
				</div>
			</header>
			
			<div class="mod-stats">
				<div class="mod-stat orange"><span>📋</span><b>Active Orders</b><strong data-stat="active_orders">0</strong></div>
				<div class="mod-stat teal"><span>👨‍🍳</span><b>Kitchen</b><strong data-stat="kitchen_queue">0</strong></div>
				<div class="mod-stat purple"><span>💰</span><b>Unpaid</b><strong data-stat="unpaid_orders">0</strong></div>
				<div class="mod-stat green"><span>🪑</span><b>Tables</b><strong data-stat="available_tables">0</strong></div>
			</div>
			
			<div class="mod-body">
				<section class="mod-menu">
					<div class="mod-menu-header">
						<h2>Menu Items</h2>
						<input type="text" class="mod-search" placeholder="🔍 Search items..." />
					</div>
					<div class="mod-cats">
						<button class="mod-cat active">All</button>
						<button class="mod-cat">Veg</button>
						<button class="mod-cat">Non-Veg</button>
						<button class="mod-cat">Drinks</button>
					</div>
					<div class="mod-items"></div>
				</section>
				
				<aside class="mod-sidebar">
					<div class="mod-order-panel">
						<div class="mod-panel-header">
							<h3>New Order</h3>
						</div>
						<div class="mod-order-type">
							<button class="mod-type active" data-t="Dine-In">🍽️ Dine-In</button>
							<button class="mod-type" data-t="Takeaway">🥡 Takeaway</button>
						</div>
						<div class="mod-pay-type">
							<button class="mod-pay active" data-p="Pay Later">Pay Later</button>
							<button class="mod-pay" data-p="Pay Now">💳 Pay Now</button>
						</div>
					<div class="mod-fields">
						<select class="mod-field mod-field-table"><option value="">Select table</option></select>
						<input class="mod-field mod-field-customer" placeholder="👤 Customer" />
						<input class="mod-field mod-field-mobile" placeholder="📱 Mobile" />
						</div>
						<textarea class="mod-notes" placeholder="📝 Notes..."></textarea>
					</div>
					
					<div class="mod-cart-panel">
						<div class="mod-cart-header">
							<h3>🛒 Current Order</h3>
							<button class="mod-clear">Clear</button>
						</div>
						<div class="mod-cart-items"></div>
						<div class="mod-totals">
							<div class="mod-row"><span>Subtotal</span><b data-total="subtotal">₹0</b></div>
							<div class="mod-row"><span>Discount</span><b data-total="discount">-₹0</b></div>
							<div class="mod-total"><span>Total</span><b data-total="grand_total">₹0</b></div>
						</div>
						<button class="mod-save">✅ Save Order</button>
					</div>
				</aside>
			</div>
		</div>
	`);

	if (!document.getElementById("modern-pos-css")) {
		const css = document.createElement("style");
		css.id = "modern-pos-css";
		css.textContent = `
			@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');
			.modern-pos { font-family: 'Poppins', sans-serif; background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); min-height: 100vh; }
			.mod-header { display: flex; justify-content: space-between; align-items: center; padding: 12px 24px; background: linear-gradient(135deg, #1a1a2e, #16213e); color: #fff; box-shadow: 0 4px 20px rgba(0,0,0,0.15); }
			.mod-logo { font-size: 24px; font-weight: 700; }
			.mod-logo span { color: #FF6B35; }
			.mod-actions { display: flex; gap: 10px; }
			.mod-btn { padding: 8px 16px; background: rgba(255,255,255,0.1); border: none; color: #fff; border-radius: 8px; cursor: pointer; font-weight: 500; transition: all 0.3s; }
			.mod-btn:hover { background: rgba(255,255,255,0.2); transform: translateY(-2px); }
			.mod-stats { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; padding: 12px 24px; background: #fff; flex-shrink: 0; }
			.mod-stat { display: grid; grid-template-columns: 32px 1fr auto; align-items: center; gap: 10px; padding: 10px 14px; border-radius: 14px; color: #fff; text-align: left; box-shadow: 0 4px 15px rgba(0,0,0,0.1); transition: transform 0.3s; min-height: 64px; }
			.mod-stat:hover { transform: translateY(-4px); }
			.mod-stat span { font-size: 22px; display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; margin: 0; }
			.mod-stat b { font-size: 11px; opacity: 0.9; display: block; margin: 0; line-height: 1.2; }
			.mod-stat strong { font-size: 24px; font-weight: 700; line-height: 1; }
			.mod-stat.orange { background: linear-gradient(135deg, #FF6B35, #f7931e); }
			.mod-stat.teal { background: linear-gradient(135deg, #2EC4B6, #20a89a); }
			.mod-stat.purple { background: linear-gradient(135deg, #8B5CF6, #7c3aed); }
			.mod-stat.green { background: linear-gradient(135deg, #10B981, #059669); }
			.mod-body { display: grid; grid-template-columns: minmax(0, 1.6fr) minmax(380px, 0.95fr); padding: 20px; gap: 20px; min-height: calc(100vh - 180px); align-items: start; }
			.mod-menu { min-width: 0; background: #fff; border-radius: 20px; padding: 20px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); display: flex; flex-direction: column; overflow: hidden; }
			.mod-menu-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-shrink: 0; }
			.mod-menu-header h2 { margin: 0; font-size: 20px; color: #1a1a2e; }
			.mod-search { width: 200px; padding: 10px 16px; border: 2px solid #e9ecef; border-radius: 12px; font-size: 14px; outline: none; transition: all 0.3s; flex-shrink: 0; }
			.mod-cats { display: flex; gap: 8px; margin-bottom: 16px; flex-shrink: 0; }
			.mod-items { display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 12px; max-height: calc(100vh - 320px); overflow-y: auto; align-content: start; padding-right: 8px; min-height: 260px; }
			.mod-item { border: 1px solid #eef2f7; border-radius: 16px; padding: 14px 14px 44px; background: #fff; box-shadow: 0 4px 15px rgba(0,0,0,0.06); cursor: pointer; transition: all 0.3s; text-align: left; position: relative; overflow: hidden; min-height: 116px; display: flex; flex-direction: column; justify-content: space-between; }
			.mod-item:hover { transform: translateY(-6px); box-shadow: 0 8px 25px rgba(255,107,53,0.2); }
			.mod-item.out { opacity: 0.5; }
			.mod-item:not(.out):active { transform: scale(0.98); }
			.mod-item-name { font-size: 14px; font-weight: 600; color: #1a1a2e; margin-bottom: 8px; line-height: 1.35; padding-right: 24px; }
			.mod-item-meta { font-size: 11px; font-weight: 500; color: #7b8794; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.04em; }
			.mod-item-price { font-size: 18px; font-weight: 700; color: #FF6B35; }
			.mod-item-btn { position: absolute; bottom: 10px; right: 10px; width: 32px; height: 32px; border-radius: 50%; background: #2EC4B6; color: #fff; border: none; font-size: 18px; cursor: pointer; opacity: 1; transform: scale(1); transition: all 0.3s; box-shadow: 0 4px 10px rgba(46,196,182,0.35); }
			.mod-item-btn:hover { background: #20a89a; }
			.mod-sidebar { min-width: 0; display: grid; grid-template-rows: auto minmax(340px, 1fr); gap: 16px; min-height: 0; }
			.mod-order-panel, .mod-cart-panel { background: rgba(255,255,255,0.8); backdrop-filter: blur(10px); border-radius: 20px; padding: 20px; box-shadow: 0 8px 30px rgba(0,0,0,0.1); }
			.mod-order-panel { overflow: auto; }
			.mod-cart-panel { display: flex; flex-direction: column; min-height: 320px; overflow: hidden; }
			.mod-panel-header h3, .mod-cart-header h3 { margin: 0 0 16px; font-size: 18px; color: #1a1a2e; }
			.mod-order-type, .mod-pay-type { display: flex; gap: 8px; margin-bottom: 12px; }
			.mod-type, .mod-pay { flex: 1; padding: 10px; border: 2px solid #e9ecef; background: #fff; border-radius: 12px; cursor: pointer; font-size: 13px; font-weight: 500; transition: all 0.3s; }
			.mod-type.active { border-color: #FF6B35; background: linear-gradient(135deg, #fff5ed, #ffeee6); color: #FF6B35; }
			.mod-pay.active { border-color: #10B981; background: linear-gradient(135deg, #ecfdf5, #d1fae5); color: #10B981; }
			.mod-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px; }
			.mod-field { width: 100%; padding: 10px 12px; border: 2px solid #e9ecef; border-radius: 10px; font-size: 13px; outline: none; transition: all 0.3s; background: #fff; }
			.mod-field:focus { border-color: #FF6B35; }
			.mod-field-table { grid-column: 1 / -1; appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23666' d='M6 8L1 3h10z'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 12px center; padding-right: 32px; }
			.mod-notes { width: 100%; padding: 10px; border: 2px solid #e9ecef; border-radius: 10px; font-size: 13px; min-height: 60px; resize: none; margin-bottom: 10px; outline: none; }
			.mod-cart-header { display: flex; justify-content: space-between; align-items: center; }
			.mod-clear { padding: 4px 10px; background: #fee2e2; border: none; color: #dc2626; border-radius: 6px; cursor: pointer; font-size: 12px; }
			.mod-cart-items { flex: 1; min-height: 0; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; }
			.mod-cart-empty { padding: 30px; text-align: center; color: #adb5bd; border: 2px dashed #e9ecef; border-radius: 12px; }
			.mod-cart-item { display: grid; grid-template-columns: minmax(0, 1fr) auto auto auto; align-items: center; gap: 10px; padding: 10px; background: #f8f9fa; border-radius: 10px; animation: slideIn 0.3s ease; }
			@keyframes slideIn { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
			.mod-cname { min-width: 0; font-size: 13px; font-weight: 500; color: #1a1a2e; line-height: 1.35; }
			.mod-cqty { display: flex; align-items: center; gap: 6px; }
			.mod-cqty button { width: 24px; height: 24px; border: none; background: #fff; border-radius: 6px; cursor: pointer; font-weight: 600; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
			.mod-cqty input { width: 36px; text-align: center; border: 1px solid #dee2e6; border-radius: 6px; height: 24px; font-size: 12px; }
			.mod-cprice { font-size: 14px; font-weight: 600; color: #1a1a2e; white-space: nowrap; }
			.mod-crem { color: #dc2626; background: none; border: none; cursor: pointer; font-size: 16px; padding: 4px; }
			.mod-totals { border-top: 2px solid #e9ecef; padding-top: 12px; }
			.mod-row { display: flex; justify-content: space-between; font-size: 13px; color: #6c757d; margin-bottom: 6px; }
			.mod-total { display: flex; justify-content: space-between; font-size: 18px; color: #1a1a2e; font-weight: 700; background: linear-gradient(135deg, #FF6B35, #f7931e); color: #fff; padding: 12px; border-radius: 12px; margin-top: 8px; }
			.mod-save { width: 100%; padding: 14px; background: linear-gradient(135deg, #10B981, #059669); border: none; color: #fff; border-radius: 12px; font-size: 16px; font-weight: 600; cursor: pointer; transition: all 0.3s; box-shadow: 0 4px 15px rgba(16,185,129,0.3); }
			.mod-save:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(16,185,129,0.4); }
			@media (max-width: 1200px) { .mod-body { grid-template-columns: 1fr; min-height: auto; } .mod-sidebar { display: flex; } .mod-items { max-height: none; } .mod-cart-panel { min-height: 320px; } .mod-stats { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
			@media (max-width: 768px) { .mod-header, .mod-menu-header { flex-direction: column; align-items: stretch; } .mod-actions, .mod-cats, .mod-order-type, .mod-pay-type { flex-wrap: wrap; } .mod-search { width: 100%; } .mod-fields { grid-template-columns: 1fr; } .mod-cart-item { grid-template-columns: 1fr; } .mod-cqty { justify-content: flex-start; } .mod-stats { grid-template-columns: 1fr; } .mod-stat { grid-template-columns: 28px 1fr auto; padding: 10px 12px; } .mod-stat span { width: 28px; height: 28px; font-size: 18px; } .mod-stat strong { font-size: 20px; } }
		`;
		document.head.appendChild(css);
	}

	const $menuGrid = $wrapper.find(".mod-items");
	const $cartList = $wrapper.find(".mod-cart-items");
	const $search = $wrapper.find(".mod-search");
	const $tableSelect = $wrapper.find(".mod-field").eq(0);
	const $discount = null;
	const $serviceCharge = null;
	const $submit = $wrapper.find(".mod-save");
	const $clearBtn = $wrapper.find(".mod-clear");

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
			$menuGrid.html('<div class="mod-cart-empty">No items found</div>');
			return;
		}

		state.items.forEach((item) => {
			const isOut = flt(item.available_qty) <= 0;
			const meta = [item.item_category, item.food_type].filter(Boolean).join(" • ");
			const cardHtml = `<div class="mod-item ${isOut ? 'out' : ''}">
				<div class="mod-item-name">${frappe.utils.escape_html(item.item_name)}</div>
				<div class="mod-item-meta">${frappe.utils.escape_html(meta || "Menu Item")}</div>
				<div class="mod-item-price">${formatMoney(item.rate)}</div>
				<button class="mod-item-btn">+</button>
			</div>`;
			const $card = $(cardHtml);
			if (!isOut) {
				$card.on("click", function () {
					addToCart(item);
				});
			}
			$card.find(".mod-item-btn").click(function (e) {
				e.stopPropagation();
				if (!isOut) addToCart(item);
			});
			$menuGrid.append($card);
		});
	}

	function renderCart() {
		$cartList.empty();
		if (!state.cart_order.length) {
			$cartList.html('<div class="mod-cart-empty">🛒 Add items to start order</div>');
			renderTotals();
			return;
		}

		state.cart_order.forEach((code) => {
			const row = state.cart[code];
			if (!row) return;
			const entry = $(`<div class="mod-cart-item">
				<div class="mod-cname">${frappe.utils.escape_html(row.item_name)}</div>
				<div class="mod-cqty">
					<button data-action="minus">-</button>
					<input type="number" value="${flt(row.qty)}" />
					<button data-action="plus">+</button>
				</div>
				<div class="mod-cprice">${formatMoney(flt(row.qty) * flt(row.rate))}</div>
				<button class="mod-crem">×</button>
			</div>`);
			entry.find('[data-action="minus"]').click(function () { updateQty(code, row.qty - 1); });
			entry.find('[data-action="plus"]').click(function () { updateQty(code, row.qty + 1); });
			entry.find("input").change(function (e) { updateQty(code, flt(e.target.value) || 1); });
			entry.find(".mod-crem").click(function () { removeFromCart(code); });
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
		if (role === "order_type") {
			$wrapper.find(".mod-type").removeClass("active");
			$wrapper.find(`.mod-type[data-t="${value}"]`).addClass("active");
		} else {
			$wrapper.find(".mod-pay").removeClass("active");
			$wrapper.find(`.mod-pay[data-p="${value}"]`).addClass("active");
		}
		$submit.text(value === "Pay Now" ? "💳 Pay Now" : "✅ Save Order");
		renderTotals();
	}

	function getPayload(paymentValues) {
		const totals = calculateTotals();
		const $flds = $wrapper.find(".mod-field");
		return {
			order_type: state.order_type,
			billing_mode: state.billing_mode,
			table_no: $tableSelect.val(),
			customer_name: $flds.eq(1).val(),
			mobile_no: $flds.eq(2).val(),
			discount_percentage: 0,
			service_charge: 0,
			remarks: $wrapper.find(".mod-notes").val(),
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
		$wrapper.find(".mod-field, .mod-notes").val("");
		renderCart();
		renderTotals();
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

	$wrapper.find(".mod-type").click(function () {
		toggleMode("order_type", $(this).attr("data-t"));
	});
	$wrapper.find(".mod-pay").click(function () {
		toggleMode("billing_mode", $(this).attr("data-p"));
	});
	$search.on("input", frappe.utils.debounce(function () {
		loadItems($search.val());
	}, 250));
	$wrapper.find(".mod-header").on("click", ".mod-btn", function() {
		const txt = $(this).text();
		if (txt.includes("Refresh")) { loadContext(); loadItems($search.val()); }
		else if (txt.includes("Live Orders")) { frappe.set_route("live-orders"); }
	});
	$clearBtn.click(resetOrder);
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
