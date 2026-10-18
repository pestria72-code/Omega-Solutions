-- 041_notification_business_events.sql
-- Generate durable in-app notifications for active members of the company when
-- invoices and purchase orders are created or move to a meaningful status.
-- Recipient selection is always constrained to the record's company.

CREATE OR REPLACE FUNCTION omega_notify_invoice_event()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  event_title TEXT;
  event_message TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    event_title := 'New invoice created';
    event_message := format('Invoice %s was created.', NEW.invoice_number);
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    event_title := 'Invoice status updated';
    event_message := format('Invoice %s changed to %s.', NEW.invoice_number, NEW.status);
  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO notifications (company_id, user_id, title, message, href, notification_type)
  SELECT NEW.company_id, membership.user_id, event_title, event_message,
         '/invoices', 'invoice'
  FROM company_memberships membership
  JOIN users recipient ON recipient.id = membership.user_id AND recipient.is_active = TRUE
  WHERE membership.company_id = NEW.company_id
    AND membership.is_active = TRUE;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS omega_invoice_notification_insert ON invoices;
CREATE TRIGGER omega_invoice_notification_insert
AFTER INSERT ON invoices
FOR EACH ROW EXECUTE FUNCTION omega_notify_invoice_event();

DROP TRIGGER IF EXISTS omega_invoice_notification_status ON invoices;
CREATE TRIGGER omega_invoice_notification_status
AFTER UPDATE OF status ON invoices
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION omega_notify_invoice_event();


CREATE OR REPLACE FUNCTION omega_notify_purchase_order_event()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  event_title TEXT;
  event_message TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    event_title := 'New purchase order created';
    event_message := format('Purchase order %s was created.', NEW.order_number);
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    event_title := 'Purchase order status updated';
    event_message := format('Purchase order %s changed to %s.', NEW.order_number, NEW.status);
  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO notifications (company_id, user_id, title, message, href, notification_type)
  SELECT NEW.company_id, membership.user_id, event_title, event_message,
         '/purchase-orders', 'purchase_order'
  FROM company_memberships membership
  JOIN users recipient ON recipient.id = membership.user_id AND recipient.is_active = TRUE
  WHERE membership.company_id = NEW.company_id
    AND membership.is_active = TRUE;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS omega_purchase_order_notification_insert ON purchase_orders;
CREATE TRIGGER omega_purchase_order_notification_insert
AFTER INSERT ON purchase_orders
FOR EACH ROW EXECUTE FUNCTION omega_notify_purchase_order_event();

DROP TRIGGER IF EXISTS omega_purchase_order_notification_status ON purchase_orders;
CREATE TRIGGER omega_purchase_order_notification_status
AFTER UPDATE OF status ON purchase_orders
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION omega_notify_purchase_order_event();
