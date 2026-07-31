"""
Workflow Execution Engine
Evaluates triggers based on events and executes subsequent actions.
"""
import logging
from sqlalchemy.orm import Session
from app.models.workflow import Workflow, Trigger, Action

logger = logging.getLogger(__name__)

class WorkflowService:
    @staticmethod
    def trigger_event(db: Session, event_type: str, payload: dict):
        """
        Entry point for all system events (e.g., 'lead_created', 'lead_status_changed').
        Evaluates triggers and executes corresponding workflows.
        """
        logger.info(f"[WorkflowEngine] Received event '{event_type}' with payload: {payload}")
        
        # 1. Find all triggers listening to this event type
        triggers = db.query(Trigger).filter(Trigger.event_type == event_type).all()
        
        for trigger in triggers:
            # 2. Evaluate condition if it exists
            condition = trigger.condition or {}
            if WorkflowService._evaluate_condition(condition, payload):
                # Condition met, execute workflow actions
                workflow = trigger.workflow
                logger.info(f"[WorkflowEngine] Trigger matched for Workflow #{workflow.id} ({workflow.name})")
                WorkflowService._execute_actions(workflow.actions, payload)

    @staticmethod
    def _evaluate_condition(condition: dict, payload: dict) -> bool:
        """
        Evaluate a simple JSON condition against the payload.
        Example condition: {"status": "Converted"}
        If the payload has payload["status"] == "Converted", it returns True.
        """
        if not condition:
            return True # No condition = always match
            
        for key, expected_val in condition.items():
            actual_val = payload.get(key)
            if actual_val != expected_val:
                return False
                
        return True

    @staticmethod
    def _execute_actions(actions: list[Action], payload: dict):
        """Execute actions in order."""
        sorted_actions = sorted(actions, key=lambda a: a.order)
        for action in sorted_actions:
            try:
                if action.action_type == "whatsapp_message":
                    WorkflowService._execute_whatsapp_message(action.payload, payload)
                elif action.action_type == "send_email":
                    WorkflowService._execute_email_message(action.payload, payload)
                else:
                    logger.warning(f"[WorkflowEngine] Unknown action type: {action.action_type}")
            except Exception as e:
                logger.error(f"[WorkflowEngine] Failed to execute action {action.id}: {str(e)}")

    @staticmethod
    def _execute_whatsapp_message(action_payload: dict, event_payload: dict):
        """
        Mock WhatsApp Integration.
        Parses templates and logs the sent message.
        """
        # action_payload is expected to have 'phone_number' and 'message_template'
        action_payload = action_payload or {}
        
        # Simple variable substitution (e.g., {{ name }} -> payload['name'])
        phone_number = action_payload.get("phone_number", "")
        message = action_payload.get("message_template", "")
        
        for key, value in event_payload.items():
            phone_number = phone_number.replace(f"{{{{ {key} }}}}", str(value))
            phone_number = phone_number.replace(f"{{{{{key}}}}}", str(value))
            message = message.replace(f"{{{{ {key} }}}}", str(value))
            message = message.replace(f"{{{{{key}}}}}", str(value))
            
        # Mock API call
        logger.info("-" * 40)
        logger.info(f"🟢 [WhatsApp API Mock] SENDING MESSAGE")
        logger.info(f"🟢 TO: {phone_number}")
        logger.info(f"🟢 MESSAGE: \n{message}")
        logger.info("-" * 40)

    @staticmethod
    def _execute_email_message(action_payload: dict, event_payload: dict):
        """Mock Email Integration"""
        action_payload = action_payload or {}
        email = action_payload.get("email", "")
        subject = action_payload.get("subject", "Automated Notification")
        body = action_payload.get("body", "")
        
        for key, value in event_payload.items():
            email = email.replace(f"{{{{ {key} }}}}", str(value))
            body = body.replace(f"{{{{ {key} }}}}", str(value))
            
        logger.info("-" * 40)
        logger.info(f"📧 [Email API Mock] SENDING EMAIL")
        logger.info(f"📧 TO: {email}")
        logger.info(f"📧 SUBJECT: {subject}")
        logger.info(f"📧 BODY: \n{body}")
        logger.info("-" * 40)
