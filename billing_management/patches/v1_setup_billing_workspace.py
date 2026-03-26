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
	<div class="billing-stock-card">
		<div class="muted">Total Items</div>
		<div class="value" data-total-items>0</div>
	</div>
	<div class="billing-stock-card">
		<div class="muted">Low Stock</div>
		<div class="value" data-low-stock>0</div>
	</div>
	<div class="billing-stock-card">
		<div class="muted">Out of Stock</div>
		<div class="value" data-out-of-stock>0</div>
	</div>
</div>
<div class="billing-stock-actions">
	<button class="btn btn-primary btn-sm" data-open-pos-billing>Open POS Billing</button>
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
	border: 1px solid #e6e6e6;
	border-radius: 8px;
	background: #fff;
}
.billing-stock-card .muted {
	color: #6c757d;
	font-size: 12px;
}
.billing-stock-card .value {
	font-size: 26px;
	font-weight: 600;
	margin-top: 2px;
}
.billing-stock-actions {
	margin-top: 14px;
}
""".strip()

	custom_block.script = """
const setText = (selector, value) => {
	const el = root_element && root_element.querySelector(selector);
	if (el) el.textContent = String(value ?? 0);
};

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

const posButton = root_element && root_element.querySelector('[data-open-pos-billing]');
if (posButton) {
	posButton.addEventListener('click', function () {
		frappe.set_route('billing-dashboard');
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

