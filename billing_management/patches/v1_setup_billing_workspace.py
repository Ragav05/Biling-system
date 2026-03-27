from __future__ import annotations

import json

import frappe


def setup_billing_workspace() -> None:
	"""Create a minimal Billing workspace with stock dashboard cards.

	Cards call `billing_management.billing.stock.dashboard.get_stock_dashboard_data` via `frappe.call`.
	"""
	# Module + names
	module_name = "Billing"
	custom_block_name = "Billing Stock Cards"
	workspace_title = "Billing Stock Dashboard"

	# 1) Ensure Module Def exists
	if not frappe.db.exists("Module Def", module_name):
		module_def = frappe.new_doc("Module Def")
		module_def.module_name = module_name
		# Link to this app so module appears correctly in module-wise workspaces.
		module_def.app_name = "billing_management"
		module_def.custom = 0
		module_def.insert(ignore_permissions=True)

	# 2) Ensure Custom HTML Block exists (upsert)
	if frappe.db.exists("Custom HTML Block", custom_block_name):
		custom_block = frappe.get_doc("Custom HTML Block", custom_block_name)
	else:
		custom_block = frappe.new_doc("Custom HTML Block")
		custom_block.name = custom_block_name
		custom_block.private = 0

	custom_block.html = """
<div class="billing-stock-cards">
	<div class="billing-stock-card" data-stock-route="all_items">
		<div class="muted">Total Items</div>
		<div class="value" data-total-items>0</div>
	</div>
	<div class="billing-stock-card billing-stock-card-clickable" data-stock-route="low_stock">
		<div class="muted">Low Stock</div>
		<div class="value" data-low-stock>0</div>
	</div>
	<div class="billing-stock-card billing-stock-card-clickable" data-stock-route="out_of_stock">
		<div class="muted">Out of Stock</div>
		<div class="value" data-out-of-stock>0</div>
	</div>
</div>
<div class="billing-stock-actions">
	<button class="btn btn-sm billing-action billing-action-stock" data-open-add-stock>
		<i class="fa fa-plus-circle"></i>
		<span>Add Stock</span>
	</button>
	<button class="btn btn-sm billing-action billing-action-item" data-open-add-item>
		<i class="fa fa-cube"></i>
		<span>Add Item</span>
	</button>
	<button class="btn btn-sm billing-action billing-action-pos" data-open-pos-billing>
		<i class="fa fa-shopping-cart"></i>
		<span>Open POS Billing</span>
	</button>
</div>
	""".strip()

	custom_block.style = """
.billing-stock-cards {
	display: flex;
	gap: 16px;
	flex-wrap: wrap;
}
.billing-stock-card {
	min-width: 220px;
	padding: 12px;
	border: 1px solid #e8eef6;
	border-radius: 10px;
	background: #fff;
	box-shadow: 0 6px 16px rgba(17, 24, 39, 0.06);
}
.billing-stock-card-clickable {
	cursor: pointer;
	transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
}
.billing-stock-card-clickable:hover {
	transform: translateY(-1px);
	border-color: #c9ddfb;
	box-shadow: 0 10px 20px rgba(17, 24, 39, 0.08);
}
.billing-stock-card .muted {
	color: #667085;
	font-size: 12px;
}
.billing-stock-card .value {
	font-size: 26px;
	font-weight: 700;
	margin-top: 2px;
	color: #1f3f73;
}
.billing-stock-actions {
	margin-top: 14px;
	display: flex;
	gap: 10px;
	flex-wrap: wrap;
}
.billing-action {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	border-radius: 10px;
	padding: 7px 12px;
	font-weight: 600;
	letter-spacing: 0.1px;
}
.billing-action-stock {
	background: #e9f9ee;
	border: 1px solid #b5e3c2;
	color: #146c43;
}
.billing-action-item {
	background: #eef6ff;
	border: 1px solid #c9ddfb;
	color: #1e4f8f;
}
.billing-action-pos {
	background: linear-gradient(135deg, #1f7ae0 0%, #0f5ec5 100%);
	border: 1px solid #0f5ec5;
	color: #fff;
}
.billing-action:hover {
	filter: brightness(1.03);
}
""".strip()

	custom_block.script = """
const setText = (selector, value) => {
	const el = root_element && root_element.querySelector(selector);
	if (el) el.textContent = String(value ?? 0);
};

const openStockItemList = (status) => {
	if (status === 'all_items') {
		frappe.set_route('List', 'Billing Item');
		return;
	}

	frappe.call({
		method: 'billing_management.billing.stock.dashboard.get_stock_items_by_status',
		args: { status },
		freeze: true,
		freeze_message: __('Loading items...'),
		callback: function (r) {
			const itemNames = (r && r.message) || [];
			if (!itemNames.length) {
				const label = status === 'out_of_stock' ? __('out of stock') : __('low stock');
				frappe.show_alert({
					message: __('No {0} items found.', [label]),
					indicator: 'blue'
				}, 5);
				return;
			}

			frappe.route_options = {
				name: ['in', itemNames]
			};
			frappe.set_route('List', 'Billing Item');
		}
	});
};

const refreshStockCards = () => {
	setText('[data-total-items]', 0);
	setText('[data-low-stock]', 0);
	setText('[data-out-of-stock]', 0);

	frappe.call({
		method: "billing_management.billing.stock.dashboard.get_stock_dashboard_data",
		callback: function (r) {
			const msg = r && r.message ? r.message : {};
			setText('[data-total-items]', msg.total_items ?? 0);
			setText('[data-low-stock]', msg.low_stock_items ?? 0);
			setText('[data-out-of-stock]', msg.out_of_stock_items ?? 0);
		},
	});
};
refreshStockCards();

const posButton = root_element && root_element.querySelector('[data-open-pos-billing]');
if (posButton) {
	posButton.addEventListener('click', function () {
		frappe.set_route('billing-dashboard');
	});
}

const addItemButton = root_element && root_element.querySelector('[data-open-add-item]');
if (addItemButton) {
	addItemButton.addEventListener('click', function () {
		frappe.new_doc('Billing Item');
	});
}

const addStockButton = root_element && root_element.querySelector('[data-open-add-stock]');
if (addStockButton) {
	addStockButton.addEventListener('click', function () {
		const d = new frappe.ui.Dialog({
			title: __('Add Stock'),
			fields: [
				{
					fieldtype: 'Link',
					fieldname: 'item_code',
					label: __('Item'),
					options: 'Billing Item',
					reqd: 1
				},
				{
					fieldtype: 'Float',
					fieldname: 'qty',
					label: __('Quantity'),
					default: 1,
					reqd: 1
				}
			],
			primary_action_label: __('Add Stock'),
			primary_action(values) {
				const qty = flt(values.qty);
				if (qty <= 0) {
					frappe.msgprint(__('Quantity must be greater than 0'));
					return;
				}

				d.disable_primary_action();
				frappe.call({
					method: 'billing_management.billing.pos.billing_pos.add_stock_for_item',
					args: {
						item_code: values.item_code,
						qty: qty
					},
					freeze: true,
					freeze_message: __('Updating stock...'),
					callback: function (r) {
						if (r && !r.exc) {
							d.hide();
							const msg = r.message || {};
							frappe.show_alert({
								message: __('Stock added: {0} (+{1})', [msg.item_code, msg.qty_added]),
								indicator: 'green'
							}, 5);
							refreshStockCards();
						}
					}
				});
			}
		});
		d.show();
	});
}

const stockCards = root_element && root_element.querySelectorAll('[data-stock-route]');
if (stockCards && stockCards.length) {
	stockCards.forEach((card) => {
		const status = card.getAttribute('data-stock-route');
		if (!status || status === 'all_items') return;
		card.addEventListener('click', function () {
			openStockItemList(status);
		});
	});
}
""".strip()

	if custom_block.is_new():
		custom_block.insert(ignore_permissions=True)
	else:
		custom_block.save(ignore_permissions=True)

	# 3) Ensure Workspace exists and includes our Custom Block
	if frappe.db.exists("Workspace", workspace_title):
		workspace = frappe.get_doc("Workspace", workspace_title)
	else:
		workspace = frappe.new_doc("Workspace")
		workspace.label = workspace_title
		workspace.title = workspace_title
		workspace.public = 1
		workspace.module = module_name

	# Ensure content includes our custom block
	blocks = [{"type": "custom_block", "data": {"custom_block_name": custom_block_name, "col": 12}}]
	workspace.content = json.dumps(blocks)

	# Ensure custom block is present (child table)
	existing = [cb.custom_block_name for cb in workspace.get("custom_blocks") or []]
	if custom_block_name not in existing:
		workspace.append(
			"custom_blocks",
			{
				"custom_block_name": custom_block_name,
				"label": custom_block_name,
			},
		)

	if workspace.is_new():
		workspace.insert(ignore_permissions=True)
	else:
		workspace.save(ignore_permissions=True)


def execute() -> None:
	# Frappe patch entrypoint.
	setup_billing_workspace()
