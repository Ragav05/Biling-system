/* POS Billing Dashboard Page
 *
 * This file exists because Frappe Page loader expects a module page folder at:
 *   billing/page/billing_dashboard/
 *
 * The actual POS implementation is embedded here (kept in sync with
 * `billing_management/public/js/billing_dashboard.js`).
 */

frappe.pages["billing-dashboard"].on_page_load = function (wrapper) {
	// POS state
	let pos = {
		items: [],
		cart: {}, // item_code -> cart row
		cart_order: [], // preserve display order
		discount_percentage: 0,
		customer: "",
	};

	const $wrapper = $(wrapper);

	const html = `
	<div class="billing-pos-root">
		<div class="billing-pos-left">
			<div class="billing-pos-toolbar">
				<input class="form-control billing-pos-search" placeholder="Search items..." />
				<button class="btn btn-default btn-sm billing-pos-refresh">Refresh</button>
				<button class="btn btn-default btn-sm billing-pos-add-stock">Add Stock</button>
				<button class="btn btn-default btn-sm billing-pos-add-item">Add Item</button>
			</div>
			<div class="billing-pos-items" style="overflow:auto; max-height: 70vh;"></div>
		</div>

		<div class="billing-pos-right">
			<div class="billing-pos-cart-header">
				<div class="h5 m-0">Cart</div>
			</div>

			<div class="billing-pos-cart" style="overflow:auto; max-height: 45vh;"></div>

			<div class="billing-pos-summary">
				<div class="row">
					<div class="col-6">
						<label class="text-muted small">Subtotal</label>
						<div class="billing-pos-subtotal h4 m-0 billing-pos-total-value">0</div>
					</div>
					<div class="col-6 text-right">
						<label class="text-muted small">Discount (%)</label>
						<input type="number" min="0" max="100" step="0.01" class="form-control billing-pos-discount" value="0" />
					</div>
				</div>

				<div class="mt-2">
					<label class="text-muted small">Discount Amount</label>
					<div class="billing-pos-discount-amount h5 m-0 billing-pos-discount-value">0</div>
				</div>

				<div class="mt-2">
					<label class="text-muted small">Total</label>
					<div class="billing-pos-grand-total h4 m-0 billing-pos-grand-value">0</div>
				</div>

				<div class="mt-3">
					<button class="btn btn-primary btn-block billing-pos-checkout" style="border-radius: 8px;">Checkout</button>
				</div>
			</div>
		</div>
	</div>`;

	$wrapper.html(html);

	// Minimal styling
	const style = `
		.billing-pos-root{
			display:flex;
			gap:16px;
			align-items:stretch;
			background: linear-gradient(180deg, #f8fbff 0%, #f5f7fa 100%);
			padding: 10px;
			border-radius: 12px;
		}
		.billing-pos-left,.billing-pos-right{
			border:1px solid #e6edf5;
			border-radius:12px;
			padding:14px;
			background: #ffffff;
			box-shadow: 0 8px 20px rgba(26, 56, 97, 0.06);
		}
		.billing-pos-left{flex: 1 1 45%;}
		.billing-pos-right{flex: 1 1 55%;}
		.billing-pos-toolbar{display:flex; gap:8px; margin-bottom:12px;}
		.billing-pos-search{
			border-radius: 10px !important;
			border-color: #dbe4f0 !important;
			height: 36px;
		}
		.billing-pos-refresh{
			border-radius: 10px !important;
			border: 1px solid #dbe4f0 !important;
			background: #f7faff !important;
			color: #23527c !important;
		}
		.billing-pos-add-stock{
			border-radius: 10px !important;
			border: 1px solid #d5e9d9 !important;
			background: #f2fbf5 !important;
			color: #0f5132 !important;
		}
		.billing-pos-add-item{
			border-radius: 10px !important;
			border: 1px solid #dbe4f0 !important;
			background: #ffffff !important;
			color: #1e4f8f !important;
		}
		.billing-pos-items{display:flex; flex-direction:column; gap:8px;}
		.billing-pos-cart-header{
			margin-bottom:12px;
			font-size: 16px;
			font-weight: 700;
			color: #23364d;
		}
		.billing-pos-item{
			display:flex; justify-content:space-between; align-items:center;
			padding:12px;
			border:1px solid #e7edf4;
			border-radius:10px;
			cursor:pointer;
			background: #fff;
			transition: all .18s ease;
		}
		.billing-pos-item:hover{
			border-color:#cfe1ff;
			background:#f8fbff;
			transform: translateY(-1px);
		}
		.billing-pos-item .name{font-weight:600;}
		.billing-pos-item .meta{font-size:12px; color:#6c757d;}
		.billing-pos-badge-out{
			display:inline-block;
			padding:2px 8px;
			border-radius:999px;
			background:#ffe8e8;
			color:#b42318;
			font-size:11px;
			font-weight:600;
		}
		.billing-pos-inline-stock{
			margin-left: 6px;
			padding: 1px 8px;
			border-radius:999px;
			border:1px solid #f2c1c1;
			background:#fff5f5;
			color:#9d174d;
			font-size:11px;
			font-weight:600;
			cursor:pointer;
		}
		.billing-pos-inline-stock:hover{
			background:#ffe9e9;
		}
		.billing-pos-item.out{opacity:0.55; cursor:not-allowed;}
		.billing-pos-row{
			display:flex; justify-content:space-between; gap:8px;
			padding:10px 12px;
			border:1px solid #e7edf4;
			border-radius:10px;
			align-items:center;
			margin-bottom:8px;
			background: #fff;
		}
		.billing-pos-row .left{display:flex; flex-direction:column; min-width: 160px;}
		.billing-pos-row .left .name{font-weight:600;}
		.billing-pos-row .qty{display:flex; align-items:center; gap:6px;}
		.billing-pos-row input.qty-input{width:80px;}
		.billing-pos-row .amount{font-weight:600;}
		.billing-pos-summary{
			border-top: 1px solid #edf2f8;
			padding-top:14px;
			background: #fcfdff;
			border-radius: 10px;
		}
		.billing-pos-total-value{color:#1e4f8f;}
		.billing-pos-discount-value{color:#c75b00;}
		.billing-pos-grand-value{
			color:#0f5132;
			font-size: 28px;
			font-weight: 700;
		}
		.billing-pos-checkout{
			border-radius: 10px !important;
			border: none !important;
			background: linear-gradient(135deg, #1f7ae0 0%, #0f5ec5 100%) !important;
			font-weight: 600;
			letter-spacing: .2px;
			height: 38px;
		}
		.billing-pos-checkout:hover{
			filter: brightness(1.04);
		}
	`;
	if (!document.getElementById("billing-pos-style")) {
		const styleEl = document.createElement("style");
		styleEl.id = "billing-pos-style";
		styleEl.innerHTML = style;
		document.head.appendChild(styleEl);
	}

	const $itemsEl = $wrapper.find(".billing-pos-items");
	const $searchEl = $wrapper.find(".billing-pos-search");
	const $cartEl = $wrapper.find(".billing-pos-cart");
	const $subtotalEl = $wrapper.find(".billing-pos-subtotal");
	const $discountEl = $wrapper.find(".billing-pos-discount");
	const $discountAmountEl = $wrapper.find(".billing-pos-discount-amount");
	const $grandTotalEl = $wrapper.find(".billing-pos-grand-total");
	const $checkoutBtn = $wrapper.find(".billing-pos-checkout");
	const $addStockBtn = $wrapper.find(".billing-pos-add-stock");
	const $addItemBtn = $wrapper.find(".billing-pos-add-item");

	const floatPrecision = cint(frappe?.boot?.sysdefaults?.float_precision ?? 0);
	const currencyCode =
		(frappe.defaults && frappe.defaults.get_default && frappe.defaults.get_default("currency")) || "INR";

	function formatMoney(value) {
		const amount = flt(value, floatPrecision);
		if (typeof format_currency === "function") {
			return format_currency(amount, currencyCode);
		}
		return `₹ ${amount}`;
	}

	function calculateTotals() {
		const cartRows = pos.cart_order.map((code) => pos.cart[code]).filter(Boolean);
		const subtotal = cartRows.reduce((sum, r) => sum + flt(r.qty) * flt(r.rate), 0);
		const discount_percentage = flt(pos.discount_percentage) || 0;
		const discount_amount = flt(subtotal * (discount_percentage / 100), floatPrecision);
		const grand_total = flt(subtotal - discount_amount, floatPrecision);
		return { subtotal, discount_amount, grand_total };
	}

	function renderTotals() {
		const t = calculateTotals();
		$subtotalEl.text(formatMoney(t.subtotal));
		$discountAmountEl.text(formatMoney(t.discount_amount));
		$grandTotalEl.text(formatMoney(t.grand_total));
	}

	function renderCart() {
		$cartEl.empty();

		if (!pos.cart_order.length) {
			$cartEl.append(`<div class="text-muted">Cart is empty.</div>`);
			pos.discount_percentage = 0;
			$discountEl.val(0);
			renderTotals();
			return;
		}

		pos.cart_order.forEach((item_code) => {
			const row = pos.cart[item_code];
			if (!row) return;

			const canIncrease = flt(row.available_qty) <= 0 ? false : flt(row.qty) < flt(row.available_qty);
			const outClass = flt(row.available_qty) === 0 ? "out" : "";

			const $row = $(`
				<div class="billing-pos-row ${outClass}">
					<div class="left">
						<div class="name">${frappe.utils.escape_html(row.item_name)}</div>
						<div class="meta">Rate: ${flt(row.rate)}</div>
					</div>
					<div class="qty">
						<button class="btn btn-default btn-sm billing-pos-qty-minus">-</button>
						<input class="form-control qty-input" type="number" min="0" step="1" value="${flt(row.qty)}" />
						<button class="btn btn-default btn-sm billing-pos-qty-plus" ${canIncrease ? "" : "disabled"}>+</button>
					</div>
					<div class="right" style="display:flex; flex-direction:column; align-items:flex-end;">
						<div class="amount">${formatMoney(row.qty * row.rate)}</div>
						<button class="btn btn-link text-danger p-0 billing-pos-remove">Remove</button>
					</div>
				</div>
			`);

			$row.find(".billing-pos-qty-minus").on("click", () => updateQty(item_code, row.qty - 1));
			$row.find(".billing-pos-qty-plus").on("click", () => updateQty(item_code, row.qty + 1));
			$row.find(".qty-input").on("change", (e) => updateQty(item_code, parseFloat(e.target.value) || 0));
			$row.find(".billing-pos-remove").on("click", () => removeFromCart(item_code));

			$cartEl.append($row);
		});

		renderTotals();
	}

	function updateQty(item_code, qty) {
		qty = Math.max(0, flt(qty));
		const row = pos.cart[item_code];
		if (!row) return;

		if (flt(row.available_qty) > 0 && qty > flt(row.available_qty)) {
			frappe.msgprint(__("Insufficient stock for {0}", [row.item_name]));
			qty = row.available_qty;
		}

		if (qty <= 0) return removeFromCart(item_code);

		row.qty = qty;
		pos.cart[item_code] = row;
		renderCart();
	}

	function removeFromCart(item_code) {
		delete pos.cart[item_code];
		pos.cart_order = pos.cart_order.filter((c) => c !== item_code);
		renderCart();
	}

	function addToCart(item) {
		const code = item.item_code;
		if (!code) return;
		if (flt(item.available_qty) <= 0) {
			frappe.msgprint(__("Item is out of stock: {0}", [item.item_name]));
			return;
		}

		if (!pos.cart[code]) {
			pos.cart[code] = {
				item_code: code,
				item_name: item.item_name,
				qty: 1,
				rate: flt(item.rate),
				available_qty: flt(item.available_qty),
				warehouse: item.warehouse,
			};
			pos.cart_order.push(code);
		} else {
			const newQty = flt(pos.cart[code].qty) + 1;
			if (flt(item.available_qty) > 0 && newQty > flt(item.available_qty)) {
				frappe.msgprint(__("Insufficient stock for {0}", [item.item_name]));
				return;
			}
			pos.cart[code].qty = newQty;
		}
		renderCart();
	}

	function renderItems() {
		$itemsEl.empty();
		if (!pos.items.length) return $itemsEl.append(`<div class="text-muted">No items found.</div>`);

		pos.items.forEach((item) => {
			const isOut = flt(item.available_qty) <= 0;
			const stockMeta = isOut
				? `<span class="billing-pos-badge-out">${__("Out of Stock")}</span><button class="billing-pos-inline-stock" data-item-code="${frappe.utils.escape_html(item.item_code)}">${__("+ Stock")}</button>`
				: `${__("Available")}: ${flt(item.available_qty)}`;
			const $item = $(`
				<div class="billing-pos-item ${isOut ? "out" : ""}">
					<div>
						<div class="name">${frappe.utils.escape_html(item.item_name)}</div>
						<div class="meta">${stockMeta}</div>
					</div>
					<div style="text-align:right;">
						<div class="name">${formatMoney(item.rate)}</div>
						<div class="meta">${__("Rate")}</div>
					</div>
				</div>
			`);
			$item.find(".billing-pos-inline-stock").on("click", (e) => {
				e.preventDefault();
				e.stopPropagation();
				openAddStockDialog(item.item_code);
			});
			$item.on("click", () => !isOut && addToCart(item));
			$itemsEl.append($item);
		});
	}

	function loadItems(searchText) {
		return frappe
			.call({
				method: "billing_management.billing.pos.billing_pos.get_pos_items",
				args: { search: searchText || "" },
				freeze: true,
				freeze_message: __("Loading items..."),
			})
			.then((r) => {
				pos.items = r.message || [];
				renderItems();
			});
	}

	function openPaymentPopup() {
		if (!pos.cart_order.length) return frappe.msgprint(__("Cart is empty"));

		const t = calculateTotals();
		if (flt(t.grand_total) <= 0) return frappe.msgprint(__("Total must be greater than 0"));

		const dialog = new frappe.ui.Dialog({
			title: __("Payment"),
			fields: [
				{
					fieldtype: "HTML",
					fieldname: "totals_html",
					options: `
						<div class="billing-payment-summary">
							<div class="billing-payment-row">
								<span>${__("Subtotal")}</span>
								<b>${formatMoney(t.subtotal)}</b>
							</div>
							<div class="billing-payment-row">
								<span>${__("Discount")}</span>
								<b>${flt(pos.discount_percentage)}%</b>
							</div>
							<div class="billing-payment-row">
								<span>${__("Discount Amount")}</span>
								<b class="billing-payment-discount">-${formatMoney(t.discount_amount)}</b>
							</div>
							<div class="billing-payment-total">
								<span>${__("Payable Total")}</span>
								<b>${formatMoney(t.grand_total)}</b>
							</div>
						</div>
					`,
				},
				{
					fieldtype: "Select",
					fieldname: "payment_method",
					label: __("Payment Method"),
					options: "Cash\nCard",
					default: "Cash",
					reqd: 1,
				},
				{
					fieldtype: "Float",
					fieldname: "payment_amount",
					label: __("Amount"),
					default: Number(flt(t.grand_total, floatPrecision).toFixed(floatPrecision)),
					reqd: 1,
				},
			],
			primary_action_label: __("Pay"),
			primary_action(values) {
				const received = flt(values.payment_amount);
				const method = values.payment_method;

				if (received === 0) return frappe.msgprint(__("Payment amount cannot be 0"));
				if (flt(received, floatPrecision) !== flt(t.grand_total, floatPrecision)) {
					return frappe.msgprint(__("Amount must match total. Expected {0}", [flt(t.grand_total)]));
				}

				dialog.disable_primary_action();
				frappe.call({
					method: "billing_management.billing.pos.billing_pos.create_invoice_with_payment",
					args: {
						customer: pos.customer || null,
						items: pos.cart_order.map((code) => ({
							item_code: pos.cart[code].item_code,
							qty: pos.cart[code].qty,
							rate: pos.cart[code].rate,
						})),
						discount_percentage: pos.discount_percentage,
						payment_method: method,
						payment_amount: received,
					},
					freeze: true,
					freeze_message: __("Creating invoice..."),
					callback(r) {
						if (r && !r.exc) {
							const invoice_name = r.message.invoice_name;
							dialog.hide();
							const paidTotal = formatMoney(r.message.grand_total);
							frappe.show_alert(
								{
									message: __("Invoice {0} created • Paid: {1}", [invoice_name, paidTotal]),
									indicator: "green",
								},
								7
							);
							pos.cart = {};
							pos.cart_order = [];
							pos.discount_percentage = 0;
							$discountEl.val(0);
							renderCart();
							frappe.set_route("Form", "Billing Invoice", invoice_name);
						}
					},
				});
			},
		});

		dialog.show();
		// Modal-only style polish for payment popup.
		const paymentStyleId = "billing-payment-modal-style";
		if (!document.getElementById(paymentStyleId)) {
			const styleEl = document.createElement("style");
			styleEl.id = paymentStyleId;
			styleEl.innerHTML = `
				.billing-payment-summary{
					background:#f8fbff;
					border:1px solid #e5edf7;
					border-radius:10px;
					padding:10px 12px;
					margin-bottom:2px;
				}
				.billing-payment-row{
					display:flex;
					justify-content:space-between;
					align-items:center;
					margin:2px 0;
					color:#364152;
				}
				.billing-payment-discount{color:#b54708;}
				.billing-payment-total{
					margin-top:8px;
					padding-top:8px;
					border-top:1px dashed #d5e2f2;
					display:flex;
					justify-content:space-between;
					align-items:center;
					font-size:15px;
				}
				.billing-payment-total b{
					font-size:20px;
					color:#0f5132;
				}
			`;
			document.head.appendChild(styleEl);
		}
	}

	function openAddStockDialog(prefillItemCode) {
		const dialog = new frappe.ui.Dialog({
			title: __("Add Stock"),
			fields: [
				{
					fieldtype: "Link",
					fieldname: "item_code",
					label: __("Item"),
					options: "Billing Item",
					reqd: 1,
				},
				{
					fieldtype: "Float",
					fieldname: "qty",
					label: __("Quantity"),
					default: 1,
					reqd: 1,
				},
			],
			primary_action_label: __("Add Stock"),
			primary_action(values) {
				const qty = flt(values.qty);
				if (qty <= 0) {
					frappe.msgprint(__("Quantity must be greater than 0"));
					return;
				}
				dialog.disable_primary_action();
				frappe.call({
					method: "billing_management.billing.pos.billing_pos.add_stock_for_item",
					args: {
						item_code: values.item_code,
						qty: qty,
					},
					freeze: true,
					freeze_message: __("Updating stock..."),
					callback: function (r) {
						if (r && !r.exc) {
							dialog.hide();
							const msg = r.message || {};
							frappe.show_alert(
								{
									message: __("Stock added: {0} (+{1})", [msg.item_code, msg.qty_added]),
									indicator: "green",
								},
								5
							);
							loadItems($searchEl.val());
						}
					},
				});
			},
		});
		dialog.show();
		if (prefillItemCode) {
			dialog.set_value("item_code", prefillItemCode);
			dialog.set_value("qty", 1);
		}
	}

	$searchEl.on(
		"input",
		frappe.utils.debounce(() => {
			loadItems($searchEl.val());
		}, 300)
	);
	$wrapper.find(".billing-pos-refresh").on("click", () => loadItems($searchEl.val()));
	$addStockBtn.on("click", openAddStockDialog);
	$addItemBtn.on("click", () => frappe.new_doc("Billing Item"));
	$discountEl.on("input", () => {
		let d = flt($discountEl.val()) || 0;
		if (d < 0) d = 0;
		if (d > 100) d = 100;
		pos.discount_percentage = d;
		renderTotals();
	});
	$checkoutBtn.on("click", openPaymentPopup);

	loadItems("");
	renderCart();
};

