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
						<div class="billing-pos-subtotal h4 m-0">0</div>
					</div>
					<div class="col-6 text-right">
						<label class="text-muted small">Discount (%)</label>
						<input type="number" min="0" max="100" step="0.01" class="form-control billing-pos-discount" value="0" />
					</div>
				</div>

				<div class="mt-2">
					<label class="text-muted small">Discount Amount</label>
					<div class="billing-pos-discount-amount h5 m-0">0</div>
				</div>

				<div class="mt-2">
					<label class="text-muted small">Total</label>
					<div class="billing-pos-grand-total h4 m-0">0</div>
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
		.billing-pos-root{display:flex;gap:16px;align-items:stretch;}
		.billing-pos-left{flex: 1 1 45%; border:1px solid #e6e6e6; border-radius:8px; padding:12px;}
		.billing-pos-right{flex: 1 1 55%; border:1px solid #e6e6e6; border-radius:8px; padding:12px;}
		.billing-pos-toolbar{display:flex; gap:8px; margin-bottom:10px;}
		.billing-pos-items{display:flex; flex-direction:column; gap:8px;}
		.billing-pos-cart-header{margin-bottom:10px;}
		.billing-pos-item{display:flex; justify-content:space-between; align-items:center; padding:10px; border:1px solid #eee; border-radius:8px; cursor:pointer;}
		.billing-pos-item:hover{background:#fafafa;}
		.billing-pos-item .name{font-weight:600;}
		.billing-pos-item .meta{font-size:12px; color:#6c757d;}
		.billing-pos-item.out{opacity:0.55; cursor:not-allowed;}
		.billing-pos-row{display:flex; justify-content:space-between; gap:8px; padding:8px 10px; border:1px solid #eee; border-radius:8px; align-items:center; margin-bottom:8px;}
		.billing-pos-row .left{display:flex; flex-direction:column; min-width: 160px;}
		.billing-pos-row .left .name{font-weight:600;}
		.billing-pos-row .qty{display:flex; align-items:center; gap:6px;}
		.billing-pos-row input.qty-input{width:80px;}
		.billing-pos-row .amount{font-weight:600;}
		.billing-pos-summary{border-top: 1px solid #f0f0f0; padding-top:12px;}
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

	const floatPrecision = cint(frappe?.boot?.sysdefaults?.float_precision ?? 0);

	function calculateTotals() {
		const cartRows = pos.cart_order.map((code) => pos.cart[code]).filter(Boolean);
		const subtotal = cartRows.reduce((sum, r) => sum + flt(r.qty) * flt(r.rate), 0);
		const discount_percentage = flt(pos.discount_percentage) || 0;
		// Keep rounding aligned with backend `round(..., float_precision)` behavior.
		const discount_amount = flt(subtotal * (discount_percentage / 100), floatPrecision);
		const grand_total = flt(subtotal - discount_amount, floatPrecision);
		return {
			subtotal,
			discount_amount,
			grand_total,
		};
	}

	function renderTotals() {
		const t = calculateTotals();
		$subtotalEl.text(flt(t.subtotal, floatPrecision));
		$discountAmountEl.text(flt(t.discount_amount, floatPrecision));
		$grandTotalEl.text(flt(t.grand_total, floatPrecision));
	}

	function renderCart() {
		$cartEl.empty();

		if (!pos.cart_order.length) {
			$cartEl.append(`<div class="text-muted">Cart is empty.</div>`);
			// If cart is empty, reset discount so totals don't look stale.
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
						<input class="form-control qty-input" type="number" min="0" step="1" value="${flt(row.qty)}" data-item-code="${item_code}" />
						<button class="btn btn-default btn-sm billing-pos-qty-plus" ${canIncrease ? "" : "disabled"}>+</button>
					</div>
					<div class="right" style="display:flex; flex-direction:column; align-items:flex-end;">
						<div class="amount">${flt(row.qty * row.rate)}</div>
						<button class="btn btn-link text-danger p-0 billing-pos-remove" data-item-code="${item_code}">Remove</button>
					</div>
				</div>
			`);

			$row.find(".billing-pos-qty-minus").on("click", () => {
				updateQty(item_code, row.qty - 1);
			});
			$row.find(".billing-pos-qty-plus").on("click", () => {
				updateQty(item_code, row.qty + 1);
			});
			$row.find(".qty-input").on("change", (e) => {
				const v = parseFloat(e.target.value) || 0;
				updateQty(item_code, v);
			});
			$row.find(".billing-pos-remove").on("click", () => {
				removeFromCart(item_code);
			});

			$cartEl.append($row);
		});

		renderTotals();
	}

	function updateQty(item_code, qty) {
		qty = Math.max(0, flt(qty));
		const row = pos.cart[item_code];
		if (!row) return;

		// UI guard: never exceed available_qty (backend also prevents negative)
		if (flt(row.available_qty) > 0 && qty > flt(row.available_qty)) {
			frappe.msgprint(__("Insufficient stock for {0}", [row.item_name]));
			qty = row.available_qty;
		}

		if (qty <= 0) {
			removeFromCart(item_code);
			return;
		}

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
		if (!pos.items.length) {
			$itemsEl.append(`<div class="text-muted">No items found.</div>`);
			return;
		}

		pos.items.forEach((item) => {
			const isOut = flt(item.available_qty) <= 0;
			const $item = $(`
				<div class="billing-pos-item ${isOut ? "out" : ""}" data-item-code="${item.item_code}">
					<div>
						<div class="name">${frappe.utils.escape_html(item.item_name)}</div>
						<div class="meta">${isOut ? __("Out of Stock") : __("Available")}: ${flt(item.available_qty)}</div>
					</div>
					<div style="text-align:right;">
						<div class="name">${flt(item.rate)}</div>
						<div class="meta">${__("Rate")}</div>
					</div>
				</div>
			`);

			$item.on("click", () => {
				if (isOut) return;
				addToCart(item);
			});

			$itemsEl.append($item);
		});
	}

	function loadItems(searchText) {
		const args = { search: searchText || "" };
		return frappe.call({
			method: "billing_management.billing.pos.billing_pos.get_pos_items",
			args: args,
			freeze: true,
			freeze_message: __("Loading items..."),
		}).then((r) => {
			pos.items = r.message || [];
			renderItems();
		});
	}

	function openPaymentPopup() {
		if (!pos.cart_order.length) {
			frappe.msgprint(__("Cart is empty"));
			return;
		}

		const t = calculateTotals();
		if (flt(t.grand_total) <= 0) {
			frappe.msgprint(__("Total must be greater than 0"));
			return;
		}

		const dialog = new frappe.ui.Dialog({
			title: __("Payment"),
			fields: [
				{
					fieldtype: "HTML",
					fieldname: "totals_html",
					options: `
						<div class="mb-2">
							<div><span class="text-muted">${__("Subtotal")}</span>: <b>${flt(t.subtotal)}</b></div>
							<div><span class="text-muted">${__("Discount")}</span>: <b>${flt(pos.discount_percentage)}%</b></div>
							<div><span class="text-muted">${__("Discount Amount")}</span>: <b>${flt(t.discount_amount)}</b></div>
							<div class="mt-1"><span>${__("Total")}</span>: <b style="font-size:18px;">${flt(t.grand_total)}</b></div>
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
					default: flt(t.grand_total),
					reqd: 1,
				},
			],
			primary_action_label: __("Pay"),
			primary_action: function (values) {
				const received = flt(values.payment_amount);
				const method = values.payment_method;
				if (received === 0) {
					frappe.msgprint(__("Payment amount cannot be 0"));
					return;
				}
				if (flt(received, floatPrecision) !== flt(t.grand_total, floatPrecision)) {
					frappe.msgprint(__("Amount must match total. Expected {0}", [flt(t.grand_total)]));
					return;
				}

				dialog.disable_primary_action();

				frappe.call({
					method: "billing_management.billing.pos.billing_pos.create_invoice_with_payment",
					args: {
						customer: pos.customer || null,
						items: pos.cart_order.map((code) => {
							const row = pos.cart[code];
							return { item_code: row.item_code, qty: row.qty, rate: row.rate };
						}),
						discount_percentage: pos.discount_percentage,
						payment_method: method,
						payment_amount: received,
					},
					freeze: true,
					freeze_message: __("Creating invoice..."),
					callback: function (r) {
						if (r && !r.exc) {
							const invoice_name = r.message.invoice_name;
							dialog.hide();
							frappe.show_alert({
								message: __("Invoice {0} created", [invoice_name]),
								indicator: "green",
							});
							// Reset cart
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
	}

	$searchEl.on("input", frappe.utils.debounce(() => {
		loadItems($searchEl.val());
	}, 300));

	$wrapper.find(".billing-pos-refresh").on("click", () => {
		loadItems($searchEl.val());
	});

	$discountEl.on("input", () => {
		let d = flt($discountEl.val()) || 0;
		if (d < 0) d = 0;
		if (d > 100) d = 100;
		pos.discount_percentage = d;
		renderTotals();
	});

	$checkoutBtn.on("click", openPaymentPopup);

	// initial render
	loadItems("");
	renderCart();
};

