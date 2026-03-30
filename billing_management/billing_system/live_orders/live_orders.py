import frappe
from frappe.utils import get_link_to_form


@frappe.whitelist()
def get_live_orders_data():
	"""Get live orders data for dashboard"""
	
	# Get active orders (not served)
	orders = frappe.get_all(
		'Billing Invoice',
		filters={
			'kitchen_status': ['in', ['Pending', 'In Progress', 'Ready']],
			'docstatus': 1
		},
		fields=[
			'name',
			'table_number',
			'order_type',
			'kitchen_status',
			'grand_total',
			'posting_date',
			'posting_time',
			'status'
		],
		order_by='posting_time desc'
	)
	
	# Get order items
	for order in orders:
		order.items = frappe.get_all(
			'Billing Invoice Item',
			filters={'parent': order.name},
			fields=['item_name', 'qty', 'item_modifications', 'kitchen_status']
		)
	
	# Get tables
	tables = frappe.get_all(
		'Restaurant Table',
		filters={'is_active': 1},
		fields=['name', 'table_name', 'table_number', 'table_type', 'zone', 'is_available', 'max_capacity']
	)
	
	# Calculate stats
	active_orders = len(orders)
	pending_kitchen = len([o for o in orders if o.kitchen_status in ['Pending', 'In Progress']])
	ready_orders = len([o for o in orders if o.kitchen_status == 'Ready'])
	occupied_tables = len([t for t in tables if not t.is_available])
	
	return {
		'orders': orders,
		'tables': tables,
		'stats': {
			'active_orders': active_orders,
			'pending_kitchen': pending_kitchen,
			'ready_orders': ready_orders,
			'occupied_tables': occupied_tables
		}
	}


@frappe.whitelist()
def update_order_status(order_name, status):
	"""Update order kitchen status"""
	doc = frappe.get_doc('Billing Invoice', order_name)
	doc.kitchen_status = status
	doc.save(ignore_permissions=True)
	
	# Update table status if order is served
	if status == 'Served':
		if doc.table_number:
			table = frappe.get_doc('Restaurant Table', doc.table_number)
			table.is_available = 1
			table.save(ignore_permissions=True)
	
	frappe.db.commit()
	return {'success': True}


@frappe.whitelist()
def get_table_orders(table_name):
	"""Get all orders for a specific table"""
	orders = frappe.get_all(
		'Billing Invoice',
		filters={'table_number': table_name},
		fields=['name', 'kitchen_status', 'grand_total', 'posting_date', 'posting_time'],
		order_by='posting_date desc, posting_time desc'
	)
	return orders


@frappe.whitelist()
def create_quick_order(table_number, items):
	"""Create a quick order from the live orders page"""
	import json
	items = json.loads(items)
	
	customer = frappe.db.get_value('Customer', {'customer_name': 'Walk-in Customer'}, 'name')
	
	doc = frappe.new_doc('Billing Invoice')
	doc.customer = customer
	doc.table_number = table_number
	doc.order_type = 'Dine-In'
	doc.posting_date = frappe.utils.today()
	
	for item in items:
		doc.append('items', {
			'item_code': item['item_code'],
			'qty': item.get('qty', 1),
			'rate': item.get('rate', 0),
			'send_to_kitchen': 1
		})
	
	doc.insert(ignore_permissions=True)
	doc.submit()
	
	# Update table status
	table = frappe.get_doc('Restaurant Table', table_number)
	table.is_available = 0
	table.save(ignore_permissions=True)
	
	frappe.db.commit()
	
	return {'name': doc.name, 'success': True}
