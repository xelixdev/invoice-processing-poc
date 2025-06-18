web: cd backend && python manage.py migrate && python manage.py load_csv_data && python manage.py auto_assign_invoices && python manage.py collectstatic --noinput && gunicorn invoice_backend.wsgi:application --bind 0.0.0.0:$PORT
release: cd backend && python manage.py migrate && python manage.py load_csv_data && python manage.py auto_assign_invoices
