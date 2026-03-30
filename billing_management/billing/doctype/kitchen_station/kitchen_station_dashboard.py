from frappe import _


def get_data():
    return {
        "modules": [
            {
                "label": _("Kitchen"),
                "icon": "fa fa-fire",
                "items": [
                    {
                        "type": "doctype",
                        "name": "Kitchen Station",
                        "label": _("Kitchen Station"),
                        "description": _("Kitchen stations for order routing"),
                    },
                ],
            },
        ],
    }
