from frappe import _


def get_data():
    return {
        "modules": [
            {
                "label": _("Restaurant"),
                "icon": "fa fa-cutlery",
                "items": [
                    {
                        "type": "doctype",
                        "name": "Restaurant Table",
                        "label": _("Restaurant Table"),
                        "description": _("Restaurant tables management"),
                    },
                ],
            },
        ],
    }
