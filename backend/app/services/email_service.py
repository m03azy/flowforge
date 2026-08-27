"""
Email Service — SendGrid API-based transactional and bulk email delivery.
Supports:
- Transactional: welcome emails, password resets, notifications
- Workflow: send from Actions Library
- Reseller broadcasts: blast emails to all tenant admins
"""
import json
from typing import Optional, List
from datetime import datetime, timezone
import urllib.request
import urllib.error


def _sendgrid_send(
    api_key: str,
    from_email: str,
    from_name: str,
    to_emails: List[dict],  # [{"email": "...", "name": "..."}]
    subject: str,
    html_content: str,
    text_content: Optional[str] = None,
    reply_to: Optional[str] = None,
) -> dict:
    """
    Core SendGrid API v3 /mail/send call using only stdlib (no extra dependencies).
    Returns {"success": True, "status_code": 202} or {"success": False, "error": "..."}
    """
    payload = {
        "personalizations": [
            {
                "to": to_emails,
                "subject": subject,
            }
        ],
        "from": {"email": from_email, "name": from_name},
        "content": [
            {"type": "text/html", "value": html_content},
        ],
    }
    if text_content:
        payload["content"].insert(0, {"type": "text/plain", "value": text_content})
    if reply_to:
        payload["reply_to"] = {"email": reply_to}

    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url="https://api.sendgrid.com/v3/mail/send",
        data=data,
        method="POST",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "User-Agent": "FlowForge/1.0",
        },
    )

    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return {"success": True, "status_code": resp.status}
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="ignore")
        return {"success": False, "status_code": e.code, "error": body}
    except Exception as exc:
        return {"success": False, "error": str(exc)}


def _build_branded_html(
    org_name: str,
    from_name: str,
    subject: str,
    body_html: str,
    cta_text: Optional[str] = None,
    cta_url: Optional[str] = None,
    footer_note: Optional[str] = None,
) -> str:
    """Build a clean, professional branded HTML email template."""
    cta_block = ""
    if cta_text and cta_url:
        cta_block = f"""
        <tr>
          <td align="center" style="padding:24px 40px 0">
            <a href="{cta_url}"
               style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);
                      color:#fff;text-decoration:none;font-weight:700;font-size:14px;
                      padding:14px 32px;border-radius:10px;letter-spacing:0.3px">
              {cta_text}
            </a>
          </td>
        </tr>"""

    footer = footer_note or f"You received this email from {org_name} via FlowForge Platform."

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>{subject}</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Segoe UI',Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 0">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%);padding:28px 40px;text-align:center">
              <p style="margin:0;font-size:22px;font-weight:800;color:#fff;letter-spacing:-0.5px">
                ⚡ {from_name}
              </p>
              <p style="margin:6px 0 0;font-size:12px;color:rgba(255,255,255,0.45);text-transform:uppercase;letter-spacing:1px">
                Powered by FlowForge
              </p>
            </td>
          </tr>

          <!-- Subject bar -->
          <tr>
            <td style="background:linear-gradient(90deg,#6366f1,#8b5cf6);padding:12px 40px">
              <p style="margin:0;font-size:13px;font-weight:600;color:#fff">{subject}</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px 24px;color:#1e293b;font-size:15px;line-height:1.7">
              {body_html}
            </td>
          </tr>

          <!-- CTA -->
          {cta_block}

          <!-- Divider -->
          <tr>
            <td style="padding:32px 40px 0">
              <hr style="border:none;border-top:1px solid #e2e8f0"/>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px 32px;text-align:center;font-size:11px;color:#94a3b8;line-height:1.6">
              <p style="margin:0">{footer}</p>
              <p style="margin:6px 0 0">&copy; {datetime.now(timezone.utc).year} FlowForge. All rights reserved.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""


# ── Pre-built transactional email templates ──────────────────────────────

def send_welcome_email(
    api_key: str,
    from_email: str,
    from_name: str,
    to_email: str,
    to_name: str,
    org_name: str,
    login_url: str = "http://localhost:5173",
) -> dict:
    """Send a welcome / account-activated email to a new tenant user."""
    body = f"""
    <p>Hello <strong>{to_name}</strong>,</p>
    <p>Welcome to <strong>{org_name}</strong> on FlowForge! Your account has been created and is ready to use.</p>
    <p>You can log in using your email address: <strong>{to_email}</strong></p>
    <p style="margin-top:16px">With FlowForge you can:</p>
    <ul style="margin:12px 0;padding-left:20px;color:#475569">
      <li>Manage workflows, CRM, documents, and team operations</li>
      <li>Receive broadcasts and alerts from your platform administrator</li>
      <li>Automate repetitive tasks with the Actions Library</li>
    </ul>
    """
    html = _build_branded_html(
        org_name=org_name,
        from_name=from_name,
        subject=f"Welcome to {org_name} on FlowForge 🎉",
        body_html=body,
        cta_text="Log In to Your Dashboard",
        cta_url=login_url,
        footer_note=f"This welcome email was sent by {org_name} via FlowForge Platform.",
    )
    return _sendgrid_send(
        api_key=api_key,
        from_email=from_email,
        from_name=from_name,
        to_emails=[{"email": to_email, "name": to_name}],
        subject=f"Welcome to {org_name} on FlowForge 🎉",
        html_content=html,
    )


def send_password_reset_email(
    api_key: str,
    from_email: str,
    from_name: str,
    to_email: str,
    to_name: str,
    org_name: str,
    reset_token: str,
    reset_url: str = "http://localhost:5173/reset-password",
) -> dict:
    """Send a password reset link email."""
    full_reset_url = f"{reset_url}?token={reset_token}"
    body = f"""
    <p>Hello <strong>{to_name}</strong>,</p>
    <p>We received a request to reset your password for your <strong>{org_name}</strong> FlowForge account.</p>
    <p>Click the button below to reset your password. This link is valid for <strong>30 minutes</strong>.</p>
    <p style="margin-top:16px;font-size:13px;color:#64748b">If you did not request a password reset, you can safely ignore this email.</p>
    """
    html = _build_branded_html(
        org_name=org_name,
        from_name=from_name,
        subject="Reset Your FlowForge Password",
        body_html=body,
        cta_text="Reset Password",
        cta_url=full_reset_url,
        footer_note="This password reset was requested for your FlowForge account. Link expires in 30 minutes.",
    )
    return _sendgrid_send(
        api_key=api_key,
        from_email=from_email,
        from_name=from_name,
        to_emails=[{"email": to_email, "name": to_name}],
        subject="Reset Your FlowForge Password",
        html_content=html,
    )


def send_notification_email(
    api_key: str,
    from_email: str,
    from_name: str,
    to_email: str,
    to_name: str,
    org_name: str,
    notification_title: str,
    notification_body: str,
    action_url: Optional[str] = None,
    action_label: str = "View Details",
) -> dict:
    """Send a generic workspace notification / alert email."""
    body = f"""
    <p>Hello <strong>{to_name}</strong>,</p>
    <p>You have a new notification from your <strong>{org_name}</strong> workspace:</p>
    <div style="background:#f1f5f9;border-left:4px solid #6366f1;border-radius:8px;padding:16px 20px;margin:20px 0">
      <p style="margin:0;font-weight:700;color:#1e293b">{notification_title}</p>
      <p style="margin:8px 0 0;color:#475569;font-size:14px">{notification_body}</p>
    </div>
    """
    html = _build_branded_html(
        org_name=org_name,
        from_name=from_name,
        subject=f"[{org_name}] {notification_title}",
        body_html=body,
        cta_text=action_label if action_url else None,
        cta_url=action_url,
    )
    return _sendgrid_send(
        api_key=api_key,
        from_email=from_email,
        from_name=from_name,
        to_emails=[{"email": to_email, "name": to_name}],
        subject=f"[{org_name}] {notification_title}",
        html_content=html,
    )


def send_reseller_broadcast_email(
    api_key: str,
    from_email: str,
    from_name: str,
    tenant_admins: List[dict],  # [{"email": "...", "name": "...", "org": "..."}]
    broadcast_title: str,
    broadcast_body: str,
    level: str = "info",
) -> dict:
    """Send a reseller broadcast announcement to all tenant admins."""
    level_colors = {
        "info": "#6366f1",
        "warning": "#f59e0b",
        "critical": "#ef4444",
    }
    border_color = level_colors.get(level, "#6366f1")

    results = {"sent": 0, "failed": 0, "errors": []}
    for admin in tenant_admins:
        body = f"""
        <p>Hello <strong>{admin.get('name', 'Admin')}</strong>,</p>
        <p>You have a platform-wide announcement from the <strong>FlowForge Reseller Administration</strong>:</p>
        <div style="background:#f8fafc;border-left:4px solid {border_color};border-radius:8px;padding:16px 20px;margin:20px 0">
          <p style="margin:0;font-weight:700;color:#1e293b;font-size:15px">{broadcast_title}</p>
          <p style="margin:10px 0 0;color:#475569;font-size:14px;line-height:1.6">{broadcast_body}</p>
        </div>
        <p style="font-size:13px;color:#64748b">This announcement applies to your organization: <strong>{admin.get('org', 'Your Organization')}</strong></p>
        """
        html = _build_branded_html(
            org_name=admin.get("org", "Your Organization"),
            from_name=from_name,
            subject=f"[Platform Announcement] {broadcast_title}",
            body_html=body,
            footer_note="This is an official broadcast from FlowForge Reseller Administration.",
        )
        result = _sendgrid_send(
            api_key=api_key,
            from_email=from_email,
            from_name=from_name,
            to_emails=[{"email": admin["email"], "name": admin.get("name", "Admin")}],
            subject=f"[Platform Announcement] {broadcast_title}",
            html_content=html,
        )
        if result.get("success"):
            results["sent"] += 1
        else:
            results["failed"] += 1
            results["errors"].append(f"{admin['email']}: {result.get('error', 'unknown')}")

    return results


def send_custom_email(
    api_key: str,
    from_email: str,
    from_name: str,
    to_email: str,
    to_name: str,
    org_name: str,
    subject: str,
    body_html: str,
    reply_to: Optional[str] = None,
) -> dict:
    """Send a fully custom email (used by workflow actions)."""
    html = _build_branded_html(
        org_name=org_name,
        from_name=from_name,
        subject=subject,
        body_html=body_html,
    )
    return _sendgrid_send(
        api_key=api_key,
        from_email=from_email,
        from_name=from_name,
        to_emails=[{"email": to_email, "name": to_name}],
        subject=subject,
        html_content=html,
        reply_to=reply_to,
    )
