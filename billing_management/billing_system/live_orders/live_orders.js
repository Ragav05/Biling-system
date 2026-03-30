frappe.pages['live-orders'].on_page_load = function(wrapper) {
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: 'Live Orders - Restaurant Management',
		single_column: true
	});

	// Add custom CSS
	$(wrapper).find('.layout-main-section').hide();
	
	$(wrapper).html(`
		<div class="live-orders-container">
			<div class="orders-header">
				<div class="header-title">
					<h2>🍽️ Live Orders Dashboard</h2>
					<p class="text-muted">Track and manage restaurant orders in real-time</p>
				</div>
				<div class="header-actions">
					<button class="btn btn-primary btn-sm" onclick="frappe.set_route('list/Billing Invoice')">
						<svg class="icon icon-sm"><use href="#icon-list"></use></svg>
						All Orders
					</button>
					<button class="btn btn-secondary btn-sm" onclick="frappe.set_route('list/Restaurant Table')">
						<svg class="icon icon-sm"><use href="#icon-table"></use></svg>
						Tables
					</button>
					<button class="btn btn-success btn-sm" onclick="openPOS()">
						<svg class="icon icon-sm"><use href="#icon-pos"></use></svg>
						New Order
					</button>
				</div>
			</div>

			<div class="stats-row">
				<div class="stat-card stat-active">
					<div class="stat-icon bg-orange">
						<svg class="icon icon-lg"><use href="#icon-clock"></use></svg>
					</div>
					<div class="stat-content">
						<span class="stat-number" id="active-orders">0</span>
						<span class="stat-label">Active Orders</span>
					</div>
				</div>
				<div class="stat-card stat-pending">
					<div class="stat-icon bg-yellow">
						<svg class="icon icon-lg"><use href="#icon-alert"></use></svg>
					</div>
					<div class="stat-content">
						<span class="stat-number" id="pending-kitchen">0</span>
						<span class="stat-label">Pending Kitchen</span>
					</div>
				</div>
				<div class="stat-card stat-ready">
					<div class="stat-icon bg-green">
						<svg class="icon icon-lg"><use href="#icon-check"></use></svg>
					</div>
					<div class="stat-content">
						<span class="stat-number" id="ready-orders">0</span>
						<span class="stat-label">Ready to Serve</span>
					</div>
				</div>
				<div class="stat-card stat-tables">
					<div class="stat-icon bg-blue">
						<svg class="icon icon-lg"><use href="#icon-table"></use></svg>
					</div>
					<div class="stat-content">
						<span class="stat-number" id="occupied-tables">0</span>
						<span class="stat-label">Occupied Tables</span>
					</div>
				</div>
			</div>

			<div class="orders-grid" id="orders-grid">
				<!-- Orders will be loaded here -->
			</div>

			<div class="tables-section">
				<h3 class="section-title">📍 Table Status</h3>
				<div class="tables-grid" id="tables-grid">
					<!-- Tables will be loaded here -->
				</div>
			</div>
		</div>

		<style>
			.live-orders-container {
				padding: 20px;
				max-width: 1400px;
				margin: 0 auto;
			}
			
			.orders-header {
				display: flex;
				justify-content: space-between;
				align-items: center;
				margin-bottom: 25px;
				padding: 20px;
				background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
				border-radius: 12px;
				color: white;
			}
			
			.header-title h2 {
				margin: 0 0 5px 0;
				font-size: 24px;
				font-weight: 600;
			}
			
			.header-title p {
				margin: 0;
				opacity: 0.9;
			}
			
			.header-actions {
				display: flex;
				gap: 10px;
			}
			
			.header-actions .btn {
				background: rgba(255,255,255,0.2);
				border: 1px solid rgba(255,255,255,0.3);
				color: white;
			}
			
			.header-actions .btn:hover {
				background: rgba(255,255,255,0.3);
			}
			
			.header-actions .btn-success {
				background: #28a745;
				border-color: #28a745;
			}
			
			.stats-row {
				display: grid;
				grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
				gap: 15px;
				margin-bottom: 30px;
			}
			
			.stat-card {
				background: white;
				border-radius: 12px;
				padding: 20px;
				display: flex;
				align-items: center;
				gap: 15px;
				box-shadow: 0 2px 8px rgba(0,0,0,0.08);
				border-left: 4px solid #667eea;
			}
			
			.stat-icon {
				width: 50px;
				height: 50px;
				border-radius: 10px;
				display: flex;
				align-items: center;
				justify-content: center;
				color: white;
			}
			
			.stat-icon.bg-orange { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); }
			.stat-icon.bg-yellow { background: linear-gradient(135deg, #f5af19 0%, #f12711 100%); }
			.stat-icon.bg-green { background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); }
			.stat-icon.bg-blue { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
			
			.stat-content {
				display: flex;
				flex-direction: column;
			}
			
			.stat-number {
				font-size: 28px;
				font-weight: 700;
				color: #1f2937;
			}
			
			.stat-label {
				font-size: 13px;
				color: #6b7280;
				margin-top: 2px;
			}
			
			.section-title {
				font-size: 18px;
				font-weight: 600;
				margin-bottom: 15px;
				color: #1f2937;
			}
			
			.orders-grid {
				display: grid;
				grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
				gap: 20px;
				margin-bottom: 40px;
			}
			
			.order-card {
				background: white;
				border-radius: 12px;
				box-shadow: 0 2px 8px rgba(0,0,0,0.08);
				overflow: hidden;
				transition: transform 0.2s, box-shadow 0.2s;
			}
			
			.order-card:hover {
				transform: translateY(-2px);
				box-shadow: 0 4px 16px rgba(0,0,0,0.12);
			}
			
			.order-header {
				padding: 15px 20px;
				border-bottom: 1px solid #e5e7eb;
				display: flex;
				justify-content: space-between;
				align-items: center;
			}
			
			.order-id {
				font-weight: 600;
				font-size: 16px;
				color: #1f2937;
			}
			
			.order-status {
				padding: 4px 12px;
				border-radius: 20px;
				font-size: 12px;
				font-weight: 600;
			}
			
			.status-pending { background: #fef3c7; color: #92400e; }
			.status-in-progress { background: #dbeafe; color: #1e40af; }
			.status-ready { background: #d1fae5; color: #065f46; }
			.status-served { background: #e5e7eb; color: #374151; }
			
			.order-body {
				padding: 20px;
			}
			
			.order-table {
				display: flex;
				align-items: center;
				gap: 8px;
				margin-bottom: 15px;
				padding: 10px;
				background: #f9fafb;
				border-radius: 8px;
			}
			
			.order-items {
				margin-bottom: 15px;
			}
			
			.order-item {
				display: flex;
				justify-content: space-between;
				align-items: flex-start;
				padding: 8px 0;
				border-bottom: 1px solid #f3f4f6;
			}
			
			.order-item:last-child {
				border-bottom: none;
			}
			
			.item-name {
				font-size: 14px;
				color: #1f2937;
				font-weight: 500;
			}
			
			.item-qty {
				background: #667eea;
				color: white;
				padding: 2px 8px;
				border-radius: 12px;
				font-size: 12px;
				font-weight: 600;
			}
			
			.item-modifications {
				font-size: 12px;
				color: #dc2626;
				margin-top: 4px;
				font-style: italic;
			}
			
			.order-footer {
				padding: 15px 20px;
				background: #f9fafb;
				display: flex;
				justify-content: space-between;
				align-items: center;
			}
			
			.order-total {
				font-size: 18px;
				font-weight: 700;
				color: #1f2937;
			}
			
			.order-time {
				font-size: 13px;
				color: #6b7280;
			}
			
			.order-actions {
				display: flex;
				gap: 8px;
				margin-top: 15px;
			}
			
			.order-actions .btn {
				flex: 1;
				font-size: 13px;
			}
			
			.tables-grid {
				display: grid;
				grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
				gap: 15px;
			}
			
			.table-card {
				background: white;
				border-radius: 12px;
				padding: 20px;
				text-align: center;
				box-shadow: 0 2px 8px rgba(0,0,0,0.08);
				cursor: pointer;
				transition: all 0.2s;
				border: 2px solid transparent;
			}
			
			.table-card:hover {
				transform: translateY(-2px);
				box-shadow: 0 4px 16px rgba(0,0,0,0.12);
			}
			
			.table-card.occupied {
				border-color: #f5576c;
				background: linear-gradient(135deg, #fff5f5 0%, #fff 100%);
			}
			
			.table-card.available {
				border-color: #38ef7d;
				background: linear-gradient(135deg, #f0fff4 0%, #fff 100%);
			}
			
			.table-number {
				font-size: 24px;
				font-weight: 700;
				margin-bottom: 5px;
			}
			
			.table-status {
				font-size: 12px;
				font-weight: 600;
				padding: 4px 8px;
				border-radius: 12px;
				display: inline-block;
			}
			
			.table-status.occupied {
				background: #f5576c;
				color: white;
			}
			
			.table-status.available {
				background: #38ef7d;
				color: white;
			}
			
			.table-type {
				font-size: 11px;
				color: #6b7280;
				margin-top: 8px;
			}
			
			.empty-state {
				text-align: center;
				padding: 60px 20px;
				color: #6b7280;
			}
			
			.empty-state svg {
				width: 64px;
				height: 64px;
				margin-bottom: 15px;
				opacity: 0.5;
			}
		</style>
	`);

	loadLiveOrders(page);
	setInterval(() => loadLiveOrders(page), 30000); // Refresh every 30 seconds
}

function openPOS() {
	frappe.set_route('list/Billing Invoice');
}

function loadLiveOrders(page) {
	frappe.call({
		method: 'billing_management.billing_system.live_orders.live_orders.get_live_orders_data',
		callback: function(r) {
			if (r.message) {
				updateStats(r.message.stats);
				renderOrders(r.message.orders);
				renderTables(r.message.tables);
			}
		}
	});
}

function updateStats(stats) {
	$('#active-orders').text(stats.active_orders);
	$('#pending-kitchen').text(stats.pending_kitchen);
	$('#ready-orders').text(stats.ready_orders);
	$('#occupied-tables').text(stats.occupied_tables);
}

function renderOrders(orders) {
	const grid = $('#orders-grid');
	
	if (orders.length === 0) {
		grid.html(`
			<div class="empty-state" style="grid-column: 1/-1;">
				<svg class="icon icon-lg"><use href="#icon-order"></use></svg>
				<h3>No Active Orders</h3>
				<p>All orders have been served or there are no new orders yet.</p>
				<button class="btn btn-primary btn-sm" onclick="openPOS()">Create New Order</button>
			</div>
		`);
		return;
	}
	
	grid.html(orders.map(order => `
		<div class="order-card" data-order="${order.name}">
			<div class="order-header">
				<span class="order-id">#${order.name}</span>
				<span class="order-status status-${order.kitchen_status.toLowerCase().replace(' ', '-')}">${order.kitchen_status}</span>
			</div>
			<div class="order-body">
				${order.table_number ? `
				<div class="order-table">
					<svg class="icon icon-sm"><use href="#icon-table"></use></svg>
					<strong>${order.table_number}</strong>
					<span class="text-muted">|</span>
					<span>${order.order_type}</span>
				</div>
				` : ''}
				
				<div class="order-items">
					${order.items.map(item => `
						<div class="order-item">
							<div>
								<div class="item-name">${item.item_name}</div>
								${item.item_modifications ? `<div class="item-modifications">⚠️ ${item.item_modifications}</div>` : ''}
							</div>
							<span class="item-qty">x${item.qty}</span>
						</div>
					`).join('')}
				</div>
				
				<div class="order-actions">
					${order.kitchen_status !== 'Served' ? `
					<button class="btn btn-sm btn-primary" onclick="updateOrderStatus('${order.name}', 'Served')">
						<svg class="icon icon-sm"><use href="#icon-check"></use></svg>
						Mark Served
					</button>
					` : ''}
					<button class="btn btn-sm btn-secondary" onclick="viewOrder('${order.name}')">
						View Details
					</button>
				</div>
			</div>
			<div class="order-footer">
				<span class="order-total">₹${order.grand_total}</span>
				<span class="order-time">🕐 ${order.posting_time || 'N/A'}</span>
			</div>
		</div>
	`).join(''));
}

function renderTables(tables) {
	const grid = $('#tables-grid');
	
	if (tables.length === 0) {
		grid.html('<div class="empty-state" style="grid-column: 1/-1;"><p>No tables configured</p></div>');
		return;
	}
	
	grid.html(tables.map(table => `
		<div class="table-card ${table.is_available ? 'available' : 'occupied'}" onclick="viewTable('${table.name}')">
			<div class="table-number">${table.table_number}</div>
			<span class="table-status ${table.is_available ? 'available' : 'occupied'}">
				${table.is_available ? 'Available' : 'Occupied'}
			</span>
			<div class="table-type">${table.table_type} • ${table.zone}</div>
		</div>
	`).join(''));
}

function updateOrderStatus(orderName, status) {
	frappe.call({
		method: 'billing_management.billing_system.live_orders.live_orders.update_order_status',
		args: {
			order_name: orderName,
			status: status
		},
		callback: function(r) {
			if (r.message) {
				frappe.show_alert({
					message: __('Order status updated to {0}', [status]),
					indicator: 'green'
				});
				refresh();
			}
		}
	});
}

function viewOrder(orderName) {
	frappe.set_route('Form/Billing Invoice', orderName);
}

function viewTable(tableName) {
	frappe.set_route('Form/Restaurant Table', tableName);
}
