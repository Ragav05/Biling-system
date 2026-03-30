from __future__ import annotations

from datetime import date, timedelta

import frappe
from frappe.utils import flt

from billing_management.billing.stock.stock_service import create_and_submit_stock_ledger_entry


def _get_one(doctype: str, *, filters: dict | None = None, field: str = "name") -> str | None:
	return frappe.db.get_value(doctype, filters=filters or {}, fieldname=field)


def _get_or_create_customer() -> str:
	customer_name = "Walk-in Customer"

	existing = frappe.db.exists("Customer", {"customer_name": customer_name})
	if existing:
		return existing

	doc = frappe.new_doc("Customer")
	doc.customer_name = customer_name
	doc.customer_type = "Individual"
	doc.insert(ignore_permissions=True)
	return doc.name


def _get_default_warehouse() -> str:
	warehouse = _get_one("Warehouse")
	if not warehouse:
		frappe.throw("No Warehouse found. Create one before loading demo data.")
	return warehouse


def _get_default_uom() -> str:
	uom = _get_one("UOM")
	if not uom:
		frappe.throw("No UOM found. Create one before loading demo data.")
	return uom


def _create_kitchen_station(*, station_name: str, station_code: str, station_type: str, is_active: int = 1, show_on_kds: int = 1) -> str:
	"""Create a kitchen station if it doesn't exist."""
	existing = frappe.db.exists("Kitchen Station", {"station_name": station_name})
	if existing:
		return existing

	doc = frappe.new_doc("Kitchen Station")
	doc.station_name = station_name
	doc.station_code = station_code
	doc.station_type = station_type
	doc.is_active = is_active
	doc.print_kot = 1
	doc.show_on_kds = show_on_kds
	doc.sequence = 1
	doc.insert(ignore_permissions=True)
	return doc.name


def _create_restaurant_table(*, table_name: str, table_number: str, table_type: str, zone: str, max_capacity: int, is_available: int = 1) -> str:
	"""Create a restaurant table if it doesn't exist."""
	existing = frappe.db.exists("Restaurant Table", {"table_name": table_name})
	if existing:
		return existing

	doc = frappe.new_doc("Restaurant Table")
	doc.table_name = table_name
	doc.table_number = table_number
	doc.table_type = table_type
	doc.zone = zone
	doc.max_capacity = max_capacity
	doc.min_capacity = 2
	doc.is_active = 1
	doc.is_available = is_available
	doc.has_qr_code = 1
	doc.insert(ignore_permissions=True)
	return doc.name


def _upsert_billing_item(**kwargs) -> None:
	"""Create or update a billing item with restaurant-specific fields."""
	item_code = kwargs.get("item_code")
	
	if frappe.db.exists("Billing Item", item_code):
		doc = frappe.get_doc("Billing Item", item_code)
	else:
		doc = frappe.new_doc("Billing Item")
		doc.item_code = item_code

	for key, value in kwargs.items():
		if key != "item_code":
			setattr(doc, key, value)

	doc.flags.ignore_validate_update_after_submit = 1
	doc.save(ignore_permissions=True)


def _post_opening_stock(*, item_code: str, warehouse: str, qty: float) -> None:
	voucher_type = "Billing Item Opening"
	voucher_no = item_code
	if frappe.db.exists("Stock Ledger", {"voucher_type": voucher_type, "voucher_no": voucher_no, "transaction_type": "Purchase"}):
		return

	create_and_submit_stock_ledger_entry(
		item=item_code,
		warehouse=warehouse,
		qty=flt(qty),
		transaction_type="Purchase",
		voucher_type=voucher_type,
		voucher_no=voucher_no,
		posting_date=str(date.today()),
		description=f"Opening stock for {item_code}",
	)


def _get_or_create_invoice(**kwargs) -> str:
	"""Create or update a billing invoice with restaurant-specific fields."""
	invoice_number = kwargs.get("invoice_number")
	
	if frappe.db.exists("Billing Invoice", invoice_number):
		doc = frappe.get_doc("Billing Invoice", invoice_number)
	else:
		doc = frappe.new_doc("Billing Invoice")
		doc.invoice_number = invoice_number

	for key, value in kwargs.items():
		if key != "invoice_number" and key != "items":
			setattr(doc, key, value)

	doc.set("items", [])
	for row in kwargs.get("items", []):
		child = doc.append("items", {})
		for k, v in row.items():
			setattr(child, k, v)

	doc.flags.ignore_validate_update_after_submit = 1
	doc.save(ignore_permissions=True)
	return doc.name


def populate_demo_data() -> dict[str, list[str]]:
	"""Populate demo data for restaurant billing system with POS integration.

	Returns created record names.
	"""
	warehouse = _get_default_warehouse()
	uom = _get_default_uom()
	customer = _get_or_create_customer()

	items_created: list[str] = []
	_invoices_created: list[str] = []
	kitchen_stations_created: list[str] = []
	tables_created: list[str] = []

	# ==================== 1. KITCHEN STATIONS ====================
	kitchen_stations_created.append(_create_kitchen_station(
		station_name="Main Kitchen - Hot",
		station_code="HK-01",
		station_type="Hot Kitchen",
		is_active=1,
		show_on_kds=1
	))
	kitchen_stations_created.append(_create_kitchen_station(
		station_name="Beverage Counter",
		station_code="BEV-01",
		station_type="Bar/Beverage",
		is_active=1,
		show_on_kds=1
	))
	kitchen_stations_created.append(_create_kitchen_station(
		station_name="Cold Station",
		station_code="CS-01",
		station_type="Cold Kitchen",
		is_active=1,
		show_on_kds=1
	))

	# ==================== 2. RESTAURANT TABLES ====================
	tables_created.append(_create_restaurant_table(
		table_name="Table 1 - Main Hall",
		table_number="T-01",
		table_type="4 Seater",
		zone="Main Hall",
		max_capacity=4,
		is_available=1
	))
	tables_created.append(_create_restaurant_table(
		table_name="Table 2 - Main Hall",
		table_number="T-02",
		table_type="4 Seater",
		zone="Main Hall",
		max_capacity=4,
		is_available=0  # Occupied
	))
	tables_created.append(_create_restaurant_table(
		table_name="Table 3 - Window Side",
		table_number="T-03",
		table_type="2 Seater",
		zone="Window Area",
		max_capacity=2,
		is_available=1
	))
	tables_created.append(_create_restaurant_table(
		table_name="Booth 1 - VIP",
		table_number="B-01",
		table_type="6 Seater",
		zone="VIP Section",
		max_capacity=6,
		is_available=1
	))

	# ==================== 3. MENU ITEMS ====================
	menu_items = [
		# === PIZZA SECTION ===
		{
			"item_code": "PIZZA-MARG-001",
			"item_name": "Margherita Pizza",
			"description": "Classic Italian pizza with fresh tomato sauce, mozzarella cheese, and basil",
			"item_category": "Pizza",
			"food_type": "Veg",
			"spice_level": "None",
			"is_stock_item": 1,
			"default_warehouse": warehouse,
			"stock_uom": uom,
			"default_rate": 349.0,
			"reorder_level": 15,
			"is_active": 1,
			"is_available": 1,
			"preparation_time": 15,
			"send_to_kitchen": 1,
			"kitchen_station": "Main Kitchen - Hot",
			"is_service_charge_applicable": 1,
		},
		{
			"item_code": "PIZZA-PAN-002",
			"item_name": "Paneer Tikka Pizza",
			"description": "Spicy paneer tikka with onions, capsicum, and cheese on pizza base",
			"item_category": "Pizza",
			"food_type": "Veg",
			"spice_level": "Medium",
			"is_stock_item": 1,
			"default_warehouse": warehouse,
			"stock_uom": uom,
			"default_rate": 449.0,
			"reorder_level": 15,
			"is_active": 1,
			"is_available": 1,
			"preparation_time": 18,
			"send_to_kitchen": 1,
			"kitchen_station": "Main Kitchen - Hot",
			"is_service_charge_applicable": 1,
		},
		# === MAIN COURSE ===
		{
			"item_code": "MAIN-CTM-003",
			"item_name": "Chicken Tikka Masala",
			"description": "Tender chicken tikka pieces in rich creamy tomato gravy, serves with naan",
			"item_category": "Main Course",
			"food_type": "Non-Veg",
			"spice_level": "Medium",
			"is_stock_item": 1,
			"default_warehouse": warehouse,
			"stock_uom": uom,
			"default_rate": 429.0,
			"reorder_level": 20,
			"is_active": 1,
			"is_available": 1,
			"preparation_time": 20,
			"send_to_kitchen": 1,
			"kitchen_station": "Main Kitchen - Hot",
			"is_service_charge_applicable": 1,
		},
		{
			"item_code": "MAIN-PM-004",
			"item_name": "Paneer Butter Masala",
			"description": "Soft paneer cubes in rich buttery tomato gravy with aromatic spices",
			"item_category": "Main Course",
			"food_type": "Veg",
			"spice_level": "Mild",
			"is_stock_item": 1,
			"default_warehouse": warehouse,
			"stock_uom": uom,
			"default_rate": 379.0,
			"reorder_level": 20,
			"is_active": 1,
			"is_available": 1,
			"preparation_time": 15,
			"send_to_kitchen": 1,
			"kitchen_station": "Main Kitchen - Hot",
			"is_service_charge_applicable": 1,
		},
		{
			"item_code": "MAIN-BR-005",
			"item_name": "Butter Naan",
			"description": "Soft leavened bread brushed with butter",
			"item_category": "Bread",
			"food_type": "Veg",
			"spice_level": "None",
			"is_stock_item": 1,
			"default_warehouse": warehouse,
			"stock_uom": uom,
			"default_rate": 69.0,
			"reorder_level": 30,
			"is_active": 1,
			"is_available": 1,
			"preparation_time": 8,
			"send_to_kitchen": 1,
			"kitchen_station": "Main Kitchen - Hot",
			"is_service_charge_applicable": 0,
		},
		# === SALADS & STARTERS ===
		{
			"item_code": "START-CS-006",
			"item_name": "Caesar Salad",
			"description": "Fresh romaine lettuce with caesar dressing, parmesan, and croutons",
			"item_category": "Salad",
			"food_type": "Veg",
			"spice_level": "None",
			"is_stock_item": 1,
			"default_warehouse": warehouse,
			"stock_uom": uom,
			"default_rate": 199.0,
			"reorder_level": 25,
			"is_active": 1,
			"is_available": 1,
			"preparation_time": 5,
			"send_to_kitchen": 1,
			"kitchen_station": "Cold Station",
			"is_service_charge_applicable": 0,
		},
		{
			"item_code": "START-CSW-007",
			"item_name": "Chicken Sandwich",
			"description": "Grilled chicken with lettuce, tomato, and mayo in toasted bread",
			"item_category": "Sandwich",
			"food_type": "Non-Veg",
			"spice_level": "Mild",
			"is_stock_item": 1,
			"default_warehouse": warehouse,
			"stock_uom": uom,
			"default_rate": 249.0,
			"reorder_level": 20,
			"is_active": 1,
			"is_available": 1,
			"preparation_time": 10,
			"send_to_kitchen": 1,
			"kitchen_station": "Cold Station",
			"is_service_charge_applicable": 0,
		},
		# === BEVERAGES ===
		{
			"item_code": "BEV-ML-008",
			"item_name": "Mango Lassi",
			"description": "Refreshing yogurt-based mango drink with cardamom",
			"item_category": "Beverages",
			"food_type": "Veg",
			"spice_level": "None",
			"is_stock_item": 1,
			"default_warehouse": warehouse,
			"stock_uom": uom,
			"default_rate": 129.0,
			"reorder_level": 30,
			"is_active": 1,
			"is_available": 1,
			"preparation_time": 5,
			"send_to_kitchen": 1,
			"kitchen_station": "Beverage Counter",
			"is_service_charge_applicable": 0,
		},
		{
			"item_code": "BEV-CC-009",
			"item_name": "Cold Coffee",
			"description": "Chilled coffee blended with ice cream and chocolate syrup",
			"item_category": "Coffee",
			"food_type": "Veg",
			"spice_level": "None",
			"is_stock_item": 1,
			"default_warehouse": warehouse,
			"stock_uom": uom,
			"default_rate": 159.0,
			"reorder_level": 30,
			"is_active": 1,
			"is_available": 1,
			"preparation_time": 5,
			"send_to_kitchen": 1,
			"kitchen_station": "Beverage Counter",
			"is_service_charge_applicable": 0,
		},
		{
			"item_code": "BEV-FJ-010",
			"item_name": "Fresh Orange Juice",
			"description": "Freshly squeezed orange juice, rich in Vitamin C",
			"item_category": "Juice/Shake",
			"food_type": "Vegan",
			"spice_level": "None",
			"is_stock_item": 1,
			"default_warehouse": warehouse,
			"stock_uom": uom,
			"default_rate": 149.0,
			"reorder_level": 25,
			"is_active": 1,
			"is_available": 1,
			"preparation_time": 5,
			"send_to_kitchen": 1,
			"kitchen_station": "Beverage Counter",
			"is_service_charge_applicable": 0,
		},
		# === DESSERTS ===
		{
			"item_code": "DES-GS-011",
			"item_name": "Gulab Jamun",
			"description": "Traditional Indian sweet dumplings in sugar syrup (2 pcs)",
			"item_category": "Dessert",
			"food_type": "Veg",
			"spice_level": "None",
			"is_stock_item": 1,
			"default_warehouse": warehouse,
			"stock_uom": uom,
			"default_rate": 99.0,
			"reorder_level": 20,
			"is_active": 1,
			"is_available": 1,
			"preparation_time": 3,
			"send_to_kitchen": 0,
			"is_service_charge_applicable": 0,
		},
		{
			"item_code": "DES-IC-VAN-012",
			"item_name": "Vanilla Ice Cream",
			"description": "Creamy vanilla ice cream with chocolate topping",
			"item_category": "Ice Cream",
			"food_type": "Veg",
			"spice_level": "None",
			"is_stock_item": 1,
			"default_warehouse": warehouse,
			"stock_uom": uom,
			"default_rate": 89.0,
			"reorder_level": 25,
			"is_active": 1,
			"is_available": 1,
			"preparation_time": 3,
			"send_to_kitchen": 0,
			"is_service_charge_applicable": 0,
		},
	]

	for item in menu_items:
		_upsert_billing_item(**item)
		items_created.append(item["item_code"])
		_post_opening_stock(item_code=item["item_code"], warehouse=warehouse, qty=50)

	# ==================== 4. POS BILLING INVOICES ====================
	today = str(date.today())
	yesterday = str(date.today() - timedelta(days=1))

	# Invoice 1 - Dine-In Order (Goes to Live Orders)
	inv_1 = _get_or_create_invoice(
		invoice_number="POS-2026-0001",
		customer=customer,
		posting_date=today,
		posting_time="12:30:00",
		table_number="Table 1 - Main Hall",
		order_type="Dine-In",
		payment_method="UPI",
		paid_amount=627.0,
		status="Paid",
		kitchen_status="Served",
		service_charge=50.0,
		discount_percentage=0,
		remarks="Lunch order - Table 1",
		items=[
			{
				"item_code": "PIZZA-MARG-001",
				"item_name": "Margherita Pizza",
				"qty": 1,
				"rate": 349.0,
				"warehouse": warehouse,
				"course_sequence": "Main Course",
				"send_to_kitchen": 1,
				"kitchen_status": "Served",
			},
			{
				"item_code": "BEV-ML-008",
				"item_name": "Mango Lassi",
				"qty": 2,
				"rate": 129.0,
				"warehouse": warehouse,
				"course_sequence": "Beverage",
				"send_to_kitchen": 1,
				"kitchen_status": "Served",
			},
		],
	)
	inv_doc = frappe.get_doc("Billing Invoice", inv_1)
	if inv_doc.docstatus == 0:
		inv_doc.submit()
	_invoices_created.append(inv_1)

	# Invoice 2 - Dine-In Order (In Progress - Goes to Live Orders)
	inv_2 = _get_or_create_invoice(
		invoice_number="POS-2026-0002",
		customer=customer,
		posting_date=today,
		posting_time="13:15:00",
		table_number="Table 2 - Main Hall",
		order_type="Dine-In",
		payment_method="Card",
		status="Submitted",
		kitchen_status="In Progress",
		service_charge=30.0,
		remarks="Family order - Window side",
		items=[
			{
				"item_code": "START-CS-006",
				"item_name": "Caesar Salad",
				"qty": 1,
				"rate": 199.0,
				"warehouse": warehouse,
				"course_sequence": "Appetizer",
				"send_to_kitchen": 1,
				"kitchen_status": "Ready",
				"item_modifications": "Dressing on side, no croutons",
			},
			{
				"item_code": "MAIN-CTM-003",
				"item_name": "Chicken Tikka Masala",
				"qty": 1,
				"rate": 429.0,
				"warehouse": warehouse,
				"course_sequence": "Main Course",
				"send_to_kitchen": 1,
				"kitchen_status": "In Progress",
				"item_modifications": "Less spicy, extra gravy",
			},
			{
				"item_code": "MAIN-BR-005",
				"item_name": "Butter Naan",
				"qty": 2,
				"rate": 69.0,
				"warehouse": warehouse,
				"course_sequence": "Main Course",
				"send_to_kitchen": 1,
				"kitchen_status": "Ready",
			},
		],
	)
	inv_doc2 = frappe.get_doc("Billing Invoice", inv_2)
	if inv_doc2.docstatus == 0:
		inv_doc2.submit()
	_invoices_created.append(inv_2)

	# Invoice 3 - Takeaway Order (NO kitchen tracking - Just Billing)
	inv_3 = _get_or_create_invoice(
		invoice_number="POS-2026-0003",
		customer=customer,
		posting_date=today,
		posting_time="13:45:00",
		order_type="Takeaway",
		payment_method="Cash",
		paid_amount=500.0,
		status="Paid",
		kitchen_status="",  # No kitchen status for takeaway
		service_charge=0,
		remarks="Takeaway order - No kitchen tracking",
		items=[
			{
				"item_code": "PIZZA-PAN-002",
				"item_name": "Paneer Tikka Pizza",
				"qty": 1,
				"rate": 449.0,
				"warehouse": warehouse,
				"course_sequence": "Main Course",
				"send_to_kitchen": 0,  # Don't send to kitchen
			},
		],
	)
	inv_doc3 = frappe.get_doc("Billing Invoice", inv_3)
	if inv_doc3.docstatus == 0:
		inv_doc3.submit()
	_invoices_created.append(inv_3)

	# Invoice 4 - Dine-In Order (Yesterday - Served)
	inv_4 = _get_or_create_invoice(
		invoice_number="POS-2026-0004",
		customer=customer,
		posting_date=yesterday,
		posting_time="19:30:00",
		table_number="Booth 1 - VIP",
		order_type="Dine-In",
		payment_method="UPI",
		paid_amount=1250.0,
		status="Paid",
		kitchen_status="Served",
		service_charge=80.0,
		remarks="Dinner - VIP Booth",
		items=[
			{
				"item_code": "MAIN-PM-004",
				"item_name": "Paneer Butter Masala",
				"qty": 2,
				"rate": 379.0,
				"warehouse": warehouse,
				"course_sequence": "Main Course",
				"send_to_kitchen": 1,
				"kitchen_status": "Served",
			},
			{
				"item_code": "MAIN-BR-005",
				"item_name": "Butter Naan",
				"qty": 4,
				"rate": 69.0,
				"warehouse": warehouse,
				"course_sequence": "Main Course",
				"send_to_kitchen": 1,
				"kitchen_status": "Served",
			},
			{
				"item_code": "BEV-CC-009",
				"item_name": "Cold Coffee",
				"qty": 2,
				"rate": 159.0,
				"warehouse": warehouse,
				"course_sequence": "Beverage",
				"send_to_kitchen": 1,
				"kitchen_status": "Served",
			},
			{
				"item_code": "DES-GS-011",
				"item_name": "Gulab Jamun",
				"qty": 2,
				"rate": 99.0,
				"warehouse": warehouse,
				"course_sequence": "Dessert",
				"send_to_kitchen": 0,
				"kitchen_status": "Served",
			},
		],
	)
	inv_doc4 = frappe.get_doc("Billing Invoice", inv_4)
	if inv_doc4.docstatus == 0:
		inv_doc4.submit()
	_invoices_created.append(inv_4)

	# Invoice 5 - Takeaway Order (Simple Billing)
	inv_5 = _get_or_create_invoice(
		invoice_number="POS-2026-0005",
		customer=customer,
		posting_date=today,
		posting_time="14:30:00",
		order_type="Takeaway",
		payment_method="UPI",
		paid_amount=300.0,
		status="Paid",
		kitchen_status="",  # No kitchen status for takeaway
		service_charge=0,
		remarks="Takeaway - Quick billing",
		items=[
			{
				"item_code": "BEV-ML-008",
				"item_name": "Mango Lassi",
				"qty": 2,
				"rate": 129.0,
				"warehouse": warehouse,
				"send_to_kitchen": 0,
			},
			{
				"item_code": "DES-GS-011",
				"item_name": "Gulab Jamun",
				"qty": 1,
				"rate": 99.0,
				"warehouse": warehouse,
				"send_to_kitchen": 0,
			},
		],
	)
	inv_doc5 = frappe.get_doc("Billing Invoice", inv_5)
	if inv_doc5.docstatus == 0:
		inv_doc5.submit()
	_invoices_created.append(inv_5)

	return {
		"items": items_created,
		"invoices": _invoices_created,
		"kitchen_stations": kitchen_stations_created,
		"tables": tables_created,
	}

