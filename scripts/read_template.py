import psycopg2
import os

try:
    conn = psycopg2.connect(
        host="localhost",
        port="15432",
        database="net_imobiliaria",
        user="postgres",
        password="postgres"
    )
    cur = conn.cursor()
    cur.execute("SELECT html_content, variables FROM email_templates WHERE name = 'password_reset'")
    row = cur.fetchone()
    if row:
        print("--- HTML CONTENT ---")
        print(row[0])
        print("--- VARIABLES ---")
        print(row[1])
    else:
        print("Template not found")
    cur.close()
    conn.close()
except Exception as e:
    print(f"Error: {e}")
