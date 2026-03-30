#!/usr/bin/env python3
"""Script to reset the Billing Stock Dashboard workspace"""
import sys
sys.path.insert(0, '/home/finstein-emp/Billing/bench-bill/apps/frappe')
sys.path.insert(0, '/home/finstein-emp/Billing/bench-bill/sites')

import frappe

frappe.init(site='bill.local', sites_path='sites')
frappe.connect()

try:
    # Delete the workspace
    if frappe.db.exists('Workspace', 'Billing Stock Dashboard'):
        frappe.delete_doc('Workspace', 'Billing Stock Dashboard', force=True)
        frappe.db.commit()
        print("Deleted existing workspace from database")
    else:
        print("Workspace does not exist in database")
    
    print("Workspace will be recreated from JSON on next load")
except Exception as e:
    print(f"Error: {e}")
finally:
    frappe.destroy()
