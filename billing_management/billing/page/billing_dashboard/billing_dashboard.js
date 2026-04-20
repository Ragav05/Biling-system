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
				<div class="mod-logo">
					<span class="mod-logo-badge">BC</span>
					<div>
						<div class="mod-logo-eyebrow">Restaurant POS</div>
						<div class="mod-logo-title">Billing Command Center</div>
					</div>
				</div>
				<div class="mod-actions">
					<button class="mod-btn" data-nav="billing-analytics">Analytics</button>
					<button class="mod-btn" data-nav="live-orders">Live Orders</button>
					<button class="mod-btn mod-btn-primary" data-action="refresh">Refresh</button>
				</div>
			</header>
			
			<div class="mod-stats">
				<div class="mod-stat orange"><span>📋</span><b>Active Orders</b><strong data-stat="active_orders">0</strong></div>
				<div class="mod-stat teal"><span>👨‍🍳</span><b>Kitchen</b><strong data-stat="kitchen_queue">0</strong></div>
				<div class="mod-stat purple"><span>💰</span><b>Unpaid</b><strong data-stat="unpaid_orders">0</strong></div>
				<div class="mod-stat green"><span>🪑</span><b>Tables</b><strong data-stat="available_tables">0</strong></div>
			</div>
			
			<div class="mod-body">
				<div class="mod-left">
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

					<section class="mod-tables-panel">
						<div class="mod-tables-head">
							<div>
								<h2>Tables at a Glance</h2>
								<p class="mod-tables-sub">Tap a free table to assign it to this order</p>
							</div>
							<div class="mod-tables-legend">
								<span><em class="dot dot-free"></em> Free <b data-tstat="free">0</b></span>
								<span><em class="dot dot-busy"></em> Occupied <b data-tstat="busy">0</b></span>
							</div>
						</div>
						<div class="mod-tables-grid" data-role="tables-grid"></div>
					</section>
				</div>

				<aside class="mod-sidebar">
					<div class="mod-order-panel">
						<div class="mod-panel-header">
							<h3>New Order</h3>
						</div>
						<div class="mod-order-type">
							<button class="mod-type active" data-t="Dine-In">🍽️ Dine-In</button>
							<button class="mod-type" data-t="Takeaway">🥡 Takeaway</button>
						</div>
						<div class="mod-billing-rule" data-role="billing-rule"></div>
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
							<div class="mod-row mod-discount-row">
								<span>Discount</span>
								<div class="mod-discount-input">
									<input type="number" class="mod-discount" min="0" max="100" step="0.5" value="0" placeholder="0" />
									<span class="mod-discount-suffix">%</span>
								</div>
								<b data-total="discount">-₹0</b>
							</div>
							<div class="mod-row mod-service-row" data-role="service-row">
								<span>Service Charge</span>
								<div class="mod-discount-input">
									<input type="number" class="mod-service-charge" min="0" step="1" value="0" placeholder="0" />
								</div>
								<b data-total="service_charge">₹0</b>
							</div>
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
			.modern-pos { font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: linear-gradient(180deg, #f5f7fb 0%, #eef2ff 100%); min-height: 100vh; color: #0f172a; }
			.mod-header { display: flex; justify-content: space-between; align-items: center; gap: 18px; padding: 18px 26px; margin: 20px 20px 0; border-radius: 20px; background: linear-gradient(135deg, #4338ca 0%, #2563eb 50%, #0891b2 100%); color: #fff; box-shadow: 0 20px 50px rgba(37, 99, 235, 0.25); flex-wrap: wrap; }
			.mod-logo { display: flex; align-items: center; gap: 14px; font-size: 14px; font-weight: 600; }
			.mod-logo-badge { width: 44px; height: 44px; border-radius: 12px; background: rgba(255,255,255,0.18); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 15px; letter-spacing: 1px; box-shadow: inset 0 0 0 1px rgba(255,255,255,0.3); }
			.mod-logo-eyebrow { font-size: 11px; text-transform: uppercase; letter-spacing: 0.14em; opacity: 0.82; font-weight: 500; }
			.mod-logo-title { font-size: 18px; font-weight: 700; margin-top: 2px; letter-spacing: -0.01em; }
			.mod-actions { display: flex; gap: 8px; flex-wrap: wrap; }
			.mod-btn { padding: 9px 16px; background: rgba(255,255,255,0.15); border: none; color: #fff; border-radius: 11px; cursor: pointer; font-size: 13px; font-weight: 600; transition: all 0.15s ease; box-shadow: inset 0 0 0 1px rgba(255,255,255,0.22); }
			.mod-btn:hover { background: rgba(255,255,255,0.28); }
			.mod-btn-primary { background: #fff; color: #1e293b; box-shadow: 0 6px 16px rgba(0,0,0,0.18); }
			.mod-btn-primary:hover { transform: translateY(-1px); }
			.mod-stats { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; padding: 18px 20px 0; }
			.mod-stat { display: grid; grid-template-columns: 40px 1fr auto; align-items: center; gap: 12px; padding: 16px 18px; border-radius: 16px; background: #fff; box-shadow: 0 4px 20px rgba(15, 23, 42, 0.05); border: 1px solid rgba(15, 23, 42, 0.04); transition: transform 0.2s ease, box-shadow 0.2s ease; position: relative; overflow: hidden; }
			.mod-stat::before { content: ""; position: absolute; left: 0; top: 0; bottom: 0; width: 4px; }
			.mod-stat.orange::before { background: linear-gradient(180deg, #f59e0b, #ef4444); }
			.mod-stat.teal::before { background: linear-gradient(180deg, #06b6d4, #0284c7); }
			.mod-stat.purple::before { background: linear-gradient(180deg, #a855f7, #ec4899); }
			.mod-stat.green::before { background: linear-gradient(180deg, #10b981, #0d9488); }
			.mod-stat:hover { transform: translateY(-3px); box-shadow: 0 14px 36px rgba(15, 23, 42, 0.10); }
			.mod-stat span { font-size: 18px; display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; border-radius: 10px; color: #fff; }
			.mod-stat.orange span { background: linear-gradient(135deg, #f59e0b, #ef4444); }
			.mod-stat.teal span { background: linear-gradient(135deg, #06b6d4, #0284c7); }
			.mod-stat.purple span { background: linear-gradient(135deg, #a855f7, #ec4899); }
			.mod-stat.green span { background: linear-gradient(135deg, #10b981, #0d9488); }
			.mod-stat b { font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.08em; display: block; }
			.mod-stat strong { font-size: 24px; font-weight: 700; color: #0f172a; letter-spacing: -0.02em; }
			.mod-body { display: grid; grid-template-columns: minmax(0, 1.6fr) minmax(380px, 0.95fr); padding: 18px 20px 28px; gap: 18px; min-height: calc(100vh - 220px); align-items: start; }
			.mod-left { min-width: 0; display: grid; grid-template-rows: auto auto; gap: 18px; }
			.mod-tables-panel { background: #fff; border-radius: 18px; padding: 22px; box-shadow: 0 4px 20px rgba(15, 23, 42, 0.05); border: 1px solid rgba(15, 23, 42, 0.04); }
			.mod-tables-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 14px; margin-bottom: 14px; flex-wrap: wrap; }
			.mod-tables-head h2 { margin: 0; font-size: 16px; font-weight: 700; color: #0f172a; letter-spacing: -0.01em; }
			.mod-tables-sub { margin: 3px 0 0; font-size: 12px; color: #64748b; }
			.mod-tables-legend { display: flex; gap: 14px; font-size: 12px; color: #475569; font-weight: 500; }
			.mod-tables-legend b { margin-left: 4px; color: #0f172a; font-weight: 700; }
			.mod-tables-legend .dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; margin-right: 6px; vertical-align: middle; }
			.mod-tables-legend .dot-free { background: #10b981; }
			.mod-tables-legend .dot-busy { background: #f59e0b; }
			.mod-tables-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(128px, 1fr)); gap: 10px; }
			.mod-tables-empty { padding: 22px; text-align: center; color: #94a3b8; background: #f8fafc; border-radius: 11px; border: 1px dashed #e2e8f0; font-size: 13px; }
			.mod-table-tile { text-align: left; padding: 12px; border-radius: 13px; border: 1px solid transparent; cursor: pointer; transition: all 0.15s ease; font-family: inherit; display: flex; flex-direction: column; gap: 6px; position: relative; overflow: hidden; }
			.mod-table-tile:disabled { cursor: not-allowed; opacity: 0.85; }
			.mod-table-tile.tile-free { background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); border-color: #a7f3d0; color: #065f46; }
			.mod-table-tile.tile-free:hover { transform: translateY(-2px); box-shadow: 0 10px 22px rgba(16,185,129,0.22); }
			.mod-table-tile.tile-busy { background: linear-gradient(135deg, #fff7ed 0%, #fef3c7 100%); border-color: #fed7aa; color: #92400e; }
			.mod-table-tile.tile-selected { outline: 2px solid #6366f1; outline-offset: 2px; }
			.tile-row { display: flex; justify-content: space-between; align-items: center; }
			.tile-no { display: inline-flex; align-items: center; justify-content: center; min-width: 28px; height: 28px; padding: 0 8px; border-radius: 8px; background: rgba(255,255,255,0.55); font-weight: 700; font-size: 13px; color: inherit; }
			.tile-status { font-size: 10px; font-weight: 700; letter-spacing: 0.08em; opacity: 0.85; }
			.tile-name { font-size: 13px; font-weight: 700; line-height: 1.2; letter-spacing: -0.01em; }
			.tile-meta { font-size: 11px; font-weight: 500; opacity: 0.8; }
			.mod-menu { min-width: 0; background: #fff; border-radius: 18px; padding: 22px; box-shadow: 0 4px 20px rgba(15, 23, 42, 0.05); border: 1px solid rgba(15, 23, 42, 0.04); display: flex; flex-direction: column; overflow: hidden; }
			.mod-menu-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-shrink: 0; gap: 12px; }
			.mod-menu-header h2 { margin: 0; font-size: 16px; font-weight: 700; color: #0f172a; letter-spacing: -0.01em; }
			.mod-search { width: 240px; padding: 10px 14px; border: 1px solid #e2e8f0; border-radius: 11px; font-size: 13px; outline: none; transition: all 0.15s ease; background: #f8fafc; }
			.mod-search:focus { border-color: #6366f1; background: #fff; box-shadow: 0 0 0 3px rgba(99,102,241,0.12); }
			.mod-cats { display: flex; gap: 6px; margin-bottom: 16px; flex-shrink: 0; flex-wrap: wrap; }
			.mod-cat { padding: 6px 14px; border: 1px solid #e2e8f0; background: #fff; border-radius: 999px; cursor: pointer; font-size: 12px; font-weight: 600; color: #475569; transition: all 0.15s ease; }
			.mod-cat:hover { background: #f8fafc; }
			.mod-cat.active { background: linear-gradient(135deg, #6366f1, #0891b2); color: #fff; border-color: transparent; box-shadow: 0 4px 12px rgba(99,102,241,0.25); }
			.mod-items { display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 12px; max-height: 420px; overflow-y: auto; align-content: start; padding-right: 4px; min-height: 260px; }
			.mod-item { border: 1px solid #e2e8f0; border-radius: 14px; padding: 14px 14px 48px; background: #fff; cursor: pointer; transition: all 0.2s ease; text-align: left; position: relative; overflow: hidden; min-height: 116px; display: flex; flex-direction: column; justify-content: space-between; }
			.mod-item:hover { transform: translateY(-3px); border-color: #c7d2fe; box-shadow: 0 12px 28px rgba(99,102,241,0.18); }
			.mod-item.out { opacity: 0.5; cursor: not-allowed; }
			.mod-item-name { font-size: 13px; font-weight: 600; color: #0f172a; margin-bottom: 6px; line-height: 1.35; padding-right: 24px; letter-spacing: -0.01em; }
			.mod-item-meta { font-size: 10px; font-weight: 600; color: #94a3b8; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.08em; }
			.mod-item-price { font-size: 17px; font-weight: 700; background: linear-gradient(135deg, #6366f1, #0891b2); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
			.mod-item-btn { position: absolute; bottom: 10px; right: 10px; width: 32px; height: 32px; border-radius: 10px; background: linear-gradient(135deg, #10b981, #0d9488); color: #fff; border: none; font-size: 18px; font-weight: 700; cursor: pointer; transition: all 0.15s ease; box-shadow: 0 4px 12px rgba(16,185,129,0.30); }
			.mod-item-btn:hover { transform: scale(1.08); }
			.mod-sidebar { min-width: 0; display: grid; grid-template-rows: auto minmax(340px, 1fr); gap: 16px; min-height: 0; }
			.mod-order-panel, .mod-cart-panel { background: #fff; border-radius: 18px; padding: 20px; box-shadow: 0 4px 20px rgba(15, 23, 42, 0.05); border: 1px solid rgba(15, 23, 42, 0.04); }
			.mod-cart-panel { display: flex; flex-direction: column; min-height: 320px; overflow: hidden; }
			.mod-panel-header h3, .mod-cart-header h3 { margin: 0 0 14px; font-size: 15px; font-weight: 700; color: #0f172a; letter-spacing: -0.01em; }
			.mod-order-type { display: flex; gap: 6px; margin-bottom: 10px; background: #f1f5f9; padding: 4px; border-radius: 11px; }
			.mod-type { flex: 1; padding: 9px 10px; border: none; background: transparent; border-radius: 8px; cursor: pointer; font-size: 12px; font-weight: 600; color: #64748b; transition: all 0.15s ease; }
			.mod-type.active { background: #fff; color: #6366f1; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
			.mod-billing-rule { margin-bottom: 12px; }
			.mod-rule { display: flex; align-items: flex-start; gap: 10px; padding: 10px 12px; border-radius: 11px; border: 1px solid transparent; font-size: 12px; line-height: 1.4; }
			.mod-rule strong { display: block; font-size: 13px; margin-bottom: 2px; letter-spacing: -0.01em; }
			.mod-rule small { color: #475569; font-size: 11px; }
			.mod-rule-dot { width: 8px; height: 8px; border-radius: 50%; margin-top: 6px; flex-shrink: 0; box-shadow: 0 0 0 3px rgba(0,0,0,0.04); }
			.mod-rule-pay-now { background: linear-gradient(135deg, #fff7ed, #fef3c7); border-color: #fed7aa; color: #92400e; }
			.mod-rule-pay-now .mod-rule-dot { background: #f59e0b; }
			.mod-rule-pay-now strong { color: #92400e; }
			.mod-rule-pay-later { background: linear-gradient(135deg, #ecfdf5, #d1fae5); border-color: #a7f3d0; color: #065f46; }
			.mod-rule-pay-later .mod-rule-dot { background: #10b981; }
			.mod-rule-pay-later strong { color: #065f46; }
			.mod-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 10px; }
			.mod-field { width: 100%; padding: 10px 12px; border: 1px solid #e2e8f0; border-radius: 10px; font-size: 13px; outline: none; transition: all 0.15s ease; background: #f8fafc; color: #0f172a; }
			.mod-field:focus { border-color: #6366f1; background: #fff; box-shadow: 0 0 0 3px rgba(99,102,241,0.12); }
			.mod-field-table { grid-column: 1 / -1; appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2364748b' d='M6 8L1 3h10z'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 12px center; padding-right: 32px; }
			.mod-notes { width: 100%; padding: 10px 12px; border: 1px solid #e2e8f0; border-radius: 10px; font-size: 13px; min-height: 60px; resize: none; margin-bottom: 4px; outline: none; background: #f8fafc; font-family: inherit; }
			.mod-notes:focus { border-color: #6366f1; background: #fff; box-shadow: 0 0 0 3px rgba(99,102,241,0.12); }
			.mod-cart-header { display: flex; justify-content: space-between; align-items: center; }
			.mod-clear { padding: 5px 12px; background: #fef2f2; border: none; color: #dc2626; border-radius: 8px; cursor: pointer; font-size: 12px; font-weight: 600; }
			.mod-clear:hover { background: #fee2e2; }
			.mod-cart-items { flex: 1; min-height: 0; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; margin-bottom: 14px; }
			.mod-cart-empty { padding: 36px 18px; text-align: center; color: #94a3b8; font-size: 13px; background: #f8fafc; border-radius: 11px; border: 1px dashed #e2e8f0; }
			.mod-cart-item { display: grid; grid-template-columns: minmax(0, 1fr) auto auto auto; align-items: center; gap: 10px; padding: 10px 12px; background: #f8fafc; border-radius: 11px; border: 1px solid #eef2ff; animation: slideIn 0.25s ease; }
			@keyframes slideIn { from { opacity: 0; transform: translateX(10px); } to { opacity: 1; transform: translateX(0); } }
			.mod-cname { min-width: 0; font-size: 13px; font-weight: 600; color: #0f172a; line-height: 1.35; }
			.mod-cqty { display: flex; align-items: center; gap: 4px; }
			.mod-cqty button { width: 26px; height: 26px; border: none; background: #fff; border-radius: 7px; cursor: pointer; font-weight: 700; color: #6366f1; box-shadow: 0 1px 3px rgba(0,0,0,0.08); transition: all 0.15s ease; }
			.mod-cqty button:hover { background: #eef2ff; }
			.mod-cqty input { width: 36px; text-align: center; border: 1px solid #e2e8f0; border-radius: 6px; height: 26px; font-size: 12px; background: #fff; }
			.mod-cprice { font-size: 13px; font-weight: 700; color: #0f172a; white-space: nowrap; }
			.mod-crem { color: #dc2626; background: none; border: none; cursor: pointer; font-size: 16px; padding: 4px 8px; border-radius: 6px; transition: all 0.15s ease; }
			.mod-crem:hover { background: #fee2e2; }
			.mod-totals { border-top: 1px solid #e2e8f0; padding-top: 12px; }
			.mod-row { display: flex; justify-content: space-between; align-items: center; font-size: 13px; color: #64748b; margin-bottom: 8px; gap: 10px; }
			.mod-row b { color: #0f172a; font-weight: 600; }
			.mod-discount-row > span, .mod-service-row > span { flex: 0 0 auto; min-width: 92px; }
			.mod-discount-input { flex: 1; display: flex; align-items: center; gap: 4px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 2px 8px; transition: all 0.15s ease; }
			.mod-discount-input:focus-within { border-color: #6366f1; background: #fff; box-shadow: 0 0 0 3px rgba(99,102,241,0.12); }
			.mod-discount, .mod-service-charge { flex: 1; width: 100%; border: none; outline: none; background: transparent; font-size: 13px; font-weight: 600; color: #0f172a; padding: 6px 0; text-align: right; -moz-appearance: textfield; }
			.mod-discount::-webkit-outer-spin-button, .mod-discount::-webkit-inner-spin-button, .mod-service-charge::-webkit-outer-spin-button, .mod-service-charge::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
			.mod-discount-suffix { color: #64748b; font-size: 12px; font-weight: 600; }
			.mod-discount-row b, .mod-service-row b { flex: 0 0 auto; min-width: 64px; text-align: right; }
			.mod-total { display: flex; justify-content: space-between; align-items: center; font-size: 16px; font-weight: 700; background: linear-gradient(135deg, #4338ca 0%, #2563eb 50%, #0891b2 100%); color: #fff; padding: 14px 16px; border-radius: 12px; margin-top: 10px; box-shadow: 0 8px 20px rgba(37,99,235,0.22); letter-spacing: -0.01em; }
			.mod-total b { font-size: 20px; }
			.mod-save { width: 100%; padding: 14px; margin-top: 12px; background: linear-gradient(135deg, #10b981, #0d9488); border: none; color: #fff; border-radius: 12px; font-size: 15px; font-weight: 700; cursor: pointer; transition: all 0.2s ease; box-shadow: 0 8px 22px rgba(16,185,129,0.30); letter-spacing: -0.01em; }
			.mod-save:hover { transform: translateY(-2px); box-shadow: 0 12px 28px rgba(16,185,129,0.4); }
			@media (max-width: 1200px) { .mod-body { grid-template-columns: 1fr; min-height: auto; } .mod-items { max-height: none; } .mod-cart-panel { min-height: 320px; } .mod-stats { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
			@media (max-width: 768px) { .mod-header, .mod-menu-header { flex-direction: column; align-items: stretch; } .mod-actions, .mod-cats, .mod-order-type { flex-wrap: wrap; } .mod-search { width: 100%; } .mod-fields { grid-template-columns: 1fr; } .mod-cart-item { grid-template-columns: 1fr; } .mod-cqty { justify-content: flex-start; } .mod-stats { grid-template-columns: 1fr; } }
		`;
		document.head.appendChild(css);
	}

	const $menuGrid = $wrapper.find(".mod-items");
	const $cartList = $wrapper.find(".mod-cart-items");
	const $search = $wrapper.find(".mod-search");
	const $tableSelect = $wrapper.find(".mod-field").eq(0);
	const $discount = $wrapper.find(".mod-discount");
	const $serviceCharge = $wrapper.find(".mod-service-charge");
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
		renderTablesGrid();
	}

	function renderTablesGrid() {
		const $grid = $wrapper.find("[data-role='tables-grid']").empty();
		const tables = state.context.tables || [];

		if (!tables.length) {
			$grid.html('<div class="mod-tables-empty">No restaurant tables configured yet.</div>');
			$wrapper.find("[data-tstat='free']").text(0);
			$wrapper.find("[data-tstat='busy']").text(0);
			return;
		}

		let free = 0;
		let busy = 0;
		const selected = $tableSelect.val();

		tables.forEach((t) => {
			const available = cint(t.is_available);
			if (available) free++;
			else busy++;
			const meta = [
				t.max_capacity ? `${t.max_capacity} seats` : null,
				t.zone || null,
			].filter(Boolean).join(" · ");
			const isSelected = selected && selected === t.name;
			const stateCls = available ? "tile-free" : "tile-busy";
			const selCls = isSelected ? "tile-selected" : "";

			const $tile = $(`
				<button type="button" class="mod-table-tile ${stateCls} ${selCls}" data-table="${frappe.utils.escape_html(t.name)}" ${available ? "" : "disabled"}>
					<div class="tile-row tile-top">
						<span class="tile-no">${frappe.utils.escape_html(String(t.table_number ?? t.table_name ?? ""))}</span>
						<span class="tile-status">${available ? "FREE" : "BUSY"}</span>
					</div>
					<div class="tile-name">${frappe.utils.escape_html(t.table_name || t.name)}</div>
					<div class="tile-meta">${frappe.utils.escape_html(meta || "—")}</div>
				</button>
			`);
			$grid.append($tile);
		});

		$wrapper.find("[data-tstat='free']").text(free);
		$wrapper.find("[data-tstat='busy']").text(busy);
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
			state.billing_mode = value === "Takeaway" ? "Pay Now" : "Pay Later";
		}
		renderBillingRule();
		$submit.text(state.billing_mode === "Pay Now" ? "💳 Generate Bill & Collect" : "✅ Save Order");
		$wrapper.find("[data-role='service-row']").toggle(state.order_type === "Dine-In");
		renderTotals();
	}

	function renderBillingRule() {
		const $rule = $wrapper.find("[data-role='billing-rule']");
		if (state.order_type === "Takeaway") {
			$rule.html(`
				<div class="mod-rule mod-rule-pay-now">
					<span class="mod-rule-dot"></span>
					<div>
						<strong>Pay Now</strong>
						<small>Bill is generated first. Collect payment before handing over the order.</small>
					</div>
				</div>
			`);
		} else {
			$rule.html(`
				<div class="mod-rule mod-rule-pay-later">
					<span class="mod-rule-dot"></span>
					<div>
						<strong>Pay After Meal</strong>
						<small>Food is prepared and served first. Collect payment from Live Orders once the guest is done.</small>
					</div>
				</div>
			`);
		}
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
			discount_percentage: flt(state.discount_percentage) || 0,
			service_charge: state.order_type === "Dine-In" ? flt(state.service_charge) || 0 : 0,
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
		state.discount_percentage = 0;
		state.service_charge = 0;
		$wrapper.find(".mod-field, .mod-notes").val("");
		$discount.val(0);
		$serviceCharge.val(0);
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
	$search.on("input", frappe.utils.debounce(function () {
		loadItems($search.val());
	}, 250));
	$discount.on("input", function () {
		let v = flt($discount.val()) || 0;
		if (v < 0) v = 0;
		if (v > 100) v = 100;
		state.discount_percentage = v;
		renderTotals();
	});
	$serviceCharge.on("input", function () {
		let v = flt($serviceCharge.val()) || 0;
		if (v < 0) v = 0;
		state.service_charge = v;
		renderTotals();
	});
	$wrapper.on("click", "[data-nav]", function () {
		frappe.set_route($(this).data("nav"));
	});
	$wrapper.on("click", ".mod-table-tile:not([disabled])", function () {
		const tableName = $(this).data("table");
		if (!tableName) return;
		if (state.order_type !== "Dine-In") {
			toggleMode("order_type", "Dine-In");
		}
		$tableSelect.val(tableName).trigger("change");
		renderTablesGrid();
	});
	$wrapper.on("click", "[data-action='refresh']", function () {
		loadContext();
		loadItems($search.val());
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
	loadContext();
	loadItems("");
	renderCart();
};
