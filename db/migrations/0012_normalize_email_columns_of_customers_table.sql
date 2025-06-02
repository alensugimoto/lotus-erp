DO $$
DECLARE
    rec RECORD;
    m text[];
    phone_pattern text := '\(?\d{3}\)?[ .-]?\d{3}[ .-]?\d{4}(x\d{3})?';
    email_pattern text := '[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]+';
    to_type_id message_recipient_types.id%type;
    cc_type_id message_recipient_types.id%type;
    invoices_purpose_id message_purposes.id%type;
    statements_purpose_id message_purposes.id%type;
    v_fax_number_id fax_numbers.id%type;
    v_email_address_id email_addresses.id%type;
BEGIN
    INSERT INTO message_recipient_types (code)
        VALUES ('to')
    RETURNING
        id INTO to_type_id;
    INSERT INTO message_recipient_types (code)
        VALUES ('cc')
    RETURNING
        id INTO cc_type_id;
    INSERT INTO message_purposes (code)
        VALUES ('invoices')
    RETURNING
        id INTO invoices_purpose_id;
    INSERT INTO message_purposes (code)
        VALUES ('statements')
    RETURNING
        id INTO statements_purpose_id;
    FOR rec IN
        WITH contact_data AS (
            SELECT
                id AS customer_id,
                "EmailInvoicesTo" AS contact_list,
                to_type_id AS recipient_type_id,
                invoices_purpose_id AS message_purpose_id
            FROM
                customers
            UNION ALL
            SELECT
                id,
                "EmailInvoicesCC",
                cc_type_id,
                invoices_purpose_id
            FROM
                customers
            UNION ALL
            SELECT
                id,
                "EmailStatementsTo",
                to_type_id,
                statements_purpose_id
            FROM
                customers
            UNION ALL
            SELECT
                id,
                "EmailStatementsCC",
                cc_type_id,
                statements_purpose_id
            FROM
                customers)
        SELECT
            customer_id,
            TRIM(unnest(regexp_split_to_array(contact_list, '[;,]'))) AS contact,
            recipient_type_id,
            message_purpose_id
        FROM
            contact_data
    LOOP
        IF rec.contact IS NULL OR rec.contact = '' OR rec.contact = '0' THEN
            CONTINUE;
        END IF;
        IF rec.recipient_type_id = to_type_id THEN
            m := regexp_match(rec.contact, format('^(fax to |or fax )(%s)$', phone_pattern));
            IF m IS NOT NULL THEN
                SELECT
                    id INTO v_fax_number_id
                FROM
                    fax_numbers
                WHERE
                    number = m[2];
                IF NOT found THEN
                    INSERT INTO fax_numbers (number)
                        VALUES (m[2])
                    RETURNING
                        id INTO v_fax_number_id;
                END IF;
                INSERT INTO customer_fax_numbers (customer_id, number_id, purpose_id)
                    VALUES (rec.customer_id, v_fax_number_id, rec.message_purpose_id);
                CONTINUE;
            END IF;
        END IF;
        IF rec.contact = ANY(ARRAY[
            E'miamidade@mdeac1.com\r\n7:miamidade@mdeac1.com',
            U&'\200Bcustomerservice@cedlaguna.com',
            E'payable@beaulieulamoureux.qc.ca\r\nKelly Skog\r\n11:56 AM (39 minutes ago)\r\nto me',
            E'\taccounting@clclightsupply.com',
            U&'\200Bcustomerservice@cedcarlsbad.com',
            'Baila B. | PowerShine" <baila@powershinelighting.com',
            E'\tHunterk@illuminico.com',
            'mailto:customerservice@stusserolympia.com'
        ]) OR rec.contact ~ format('^(%s)$', email_pattern) THEN
            SELECT
                id INTO v_email_address_id
            FROM
                email_addresses
            WHERE
                address = rec.contact;
            IF NOT found THEN
                INSERT INTO email_addresses (address)
                    VALUES (rec.contact)
                RETURNING
                    id INTO v_email_address_id;
            END IF;
            INSERT INTO customer_email_addresses (customer_id, address_id, recipient_type_id, purpose_id)
                VALUES (rec.customer_id, v_email_address_id, rec.recipient_type_id, rec.message_purpose_id);
            CONTINUE;
        END IF;
        RAISE EXCEPTION 'Unknown contact: "%"', rec.contact;
    END LOOP;
END;
$$;

alter table customers
drop column "EmailInvoicesTo";
alter table customers
drop column "EmailInvoicesCC";
alter table customers
drop column "EmailStatementsTo";
alter table customers
drop column "EmailStatementsCC";
