from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required, user_passes_test
from django.contrib.auth import login, logout, authenticate
from django.contrib import messages
from django.core.mail import send_mail
from django.conf import settings
from django.core.exceptions import PermissionDenied
from .models import User, ServiceCategory, Service, Project, Message, Meeting, BudgetDiscussion, Payment, Expense, Invoice, FinancialReport
from .forms import (
    UserRegistrationForm, ServiceCategoryForm, ServiceForm,
    ProjectForm, MessageForm, MeetingForm, ProjectInquiryForm,
    InvoiceForm, PaymentForm, ExpenseForm, FinancialReportForm
)
from django.db import models
from django.db.models import Q
from django.db.utils import IntegrityError
from django.utils import timezone

def home(request):
    services = Service.objects.all()
    return render(request, 'core/home.html', {'services': services})

def register(request):
    if request.method == 'POST':
        form = UserRegistrationForm(request.POST, request.FILES)
        if form.is_valid():
            user = form.save(commit=False)
            user.user_type = 'client'  # Default user type for registration
            user.save()
            login(request, user)
            messages.success(request, 'Registration successful!')
            return redirect('dashboard')
    else:
        form = UserRegistrationForm()
    return render(request, 'core/register.html', {'form': form})

@login_required
def dashboard(request):
    user = request.user
    context = {}
    
    # Get recent messages for the user
    recent_messages = Message.objects.filter(
        Q(recipient=user) | Q(sender=user)
    ).order_by('-created_at')[:5]
    context['recent_messages'] = recent_messages
    
    if user.user_type == 'admin':
        # Admin dashboard data
        projects = Project.objects.all().order_by('-created_at')
        staff = User.objects.filter(user_type='staff')
        
        # Financial data for admin
        total_income = Payment.objects.aggregate(total=models.Sum('amount'))['total'] or 0
        total_expenses = Expense.objects.aggregate(total=models.Sum('amount'))['total'] or 0
        net_profit = total_income - total_expenses
        
        context.update({
            'projects': projects,
            'staff': staff,
            'total_projects': Project.objects.count(),
            'active_staff': User.objects.filter(user_type='staff', is_active=True).count(),
            'total_clients': User.objects.filter(user_type='client').count(),
            'total_income': total_income,
            'total_expenses': total_expenses,
            'net_profit': net_profit,
            'recent_invoices': Invoice.objects.order_by('-created_at')[:5],
            'recent_payments': Payment.objects.order_by('-created_at')[:5],
            'recent_expenses': Expense.objects.order_by('-created_at')[:5],
            'recent_reports': FinancialReport.objects.order_by('-created_at')[:5],
        })
        template = 'core/dashboard.html'
    elif user.user_type == 'staff':
        # Staff dashboard data
        projects = Project.objects.filter(staff=user).order_by('-created_at')
        context['projects'] = projects
        template = 'core/staff_dashboard.html'
    else:  # client
        # Client dashboard data
        projects = Project.objects.filter(client=user).order_by('-created_at')
        
        # Financial data for client
        client_invoices = Invoice.objects.filter(project__client=user)
        total_invoiced = client_invoices.aggregate(total=models.Sum('amount'))['total'] or 0
        total_paid = Payment.objects.filter(invoice__project__client=user).aggregate(total=models.Sum('amount'))['total'] or 0
        pending_payments = total_invoiced - total_paid
        
        context.update({
            'projects': projects,
            'total_invoiced': total_invoiced,
            'total_paid': total_paid,
            'pending_payments': pending_payments,
            'recent_invoices': client_invoices.order_by('-created_at')[:5],
            'recent_payments': Payment.objects.filter(invoice__project__client=user).order_by('-created_at')[:5],
        })
        template = 'core/client_dashboard.html'
    
    return render(request, template, context)

@login_required
@user_passes_test(lambda u: u.user_type == 'admin')
def add_service_category(request):
    if request.method == 'POST':
        form = ServiceCategoryForm(request.POST)
        if form.is_valid():
            form.save()
            messages.success(request, 'Service category added successfully!')
            return redirect('dashboard')
    else:
        form = ServiceCategoryForm()
    return render(request, 'core/add_service_category.html', {'form': form})

@login_required
@user_passes_test(lambda u: u.user_type == 'admin')
def add_service(request):
    if request.method == 'POST':
        form = ServiceForm(request.POST)
        if form.is_valid():
            form.save()
            messages.success(request, 'Service added successfully!')
            return redirect('dashboard')
    else:
        form = ServiceForm()
    return render(request, 'core/add_service.html', {'form': form})

@login_required
def project_detail(request, project_id):
    project = get_object_or_404(Project, id=project_id)
    if not (request.user == project.client or request.user == project.staff or request.user.user_type == 'admin'):
        raise PermissionDenied
    
    messages = Message.objects.filter(project=project)
    meetings = Meeting.objects.filter(project=project)
    budget_discussions = BudgetDiscussion.objects.filter(project=project)
    
    if request.method == 'POST':
        form = MessageForm(request.POST, request.FILES)
        if form.is_valid():
            message = form.save(commit=False)
            message.sender = request.user
            message.project = project
            message.save()
            return redirect('project_detail', project_id=project_id)
    else:
        form = MessageForm()
    
    return render(request, 'core/project_detail.html', {
        'project': project,
        'messages': messages,
        'meetings': meetings,
        'budget_discussions': budget_discussions,
        'form': form,
        'now': timezone.now(),  # Add current time to context
    })

@login_required
@user_passes_test(lambda u: u.user_type == 'staff')
def schedule_meeting(request, project_id):
    project = get_object_or_404(Project, id=project_id)
    
    if request.method == 'POST':
        form = MeetingForm(request.POST)
        if form.is_valid():
            meeting = form.save(commit=False)
            meeting.project = project
            meeting.staff = request.user
            meeting.client = project.client
            meeting.save()
            
            # Send email notification
            subject = f'New Meeting Scheduled - {project.service.name}'
            message = f'''
            Dear {project.client.username},
            
            A new meeting has been scheduled for your project "{project.service.name}".
            
            Meeting Details:
            - Date & Time: {meeting.date_time}
            - Location: {meeting.location}
            - Agenda: {meeting.agenda}
            
            Please log in to your account to view more details.
            
            Best regards,
            Construction Company Team
            '''
            send_mail(
                subject,
                message,
                settings.EMAIL_HOST_USER,
                [project.client.email],
                fail_silently=False,
            )
            
            messages.success(request, 'Meeting scheduled successfully!')
            return redirect('project_detail', project_id=project_id)
    else:
        form = MeetingForm()
    
    return render(request, 'core/schedule_meeting.html', {
        'form': form,
        'project': project,
    })

@login_required
def project_inquiry(request, service_id):
    service = get_object_or_404(Service, id=service_id)
    
    if request.method == 'POST':
        form = ProjectInquiryForm(request.POST)
        if form.is_valid():
            project = form.save(commit=False)
            project.client = request.user
            project.service = service
            project.status = 'pending'
            project.save()
            
            messages.success(request, 'Your project inquiry has been submitted successfully!')
            return redirect('dashboard')
    else:
        form = ProjectInquiryForm()
    
    return render(request, 'core/project_inquiry.html', {
        'form': form,
        'service': service,
    })

@login_required
@user_passes_test(lambda u: u.user_type == 'admin')
def accept_inquiry(request, project_id):
    project = get_object_or_404(Project, id=project_id)
    
    if project.status != 'pending':
        messages.error(request, 'This project is not in pending status.')
        return redirect('dashboard')
    
    available_staff = User.objects.filter(user_type='staff', is_active=True)
    
    if request.method == 'POST':
        staff_id = request.POST.get('staff')
        if staff_id:
            staff = get_object_or_404(User, id=staff_id, user_type='staff')
            project.staff = staff
            project.status = 'in_progress'
            project.save()
            
            # Send email to client
            subject = 'Your Project Inquiry Has Been Accepted'
            message = f'''
            Dear {project.client.username},
            
            Your project inquiry for {project.service.name} has been accepted!
            A staff member ({staff.username}) has been assigned to your project.
            
            Project Details:
            - Service: {project.service.name}
            - Budget: ${project.budget}
            - Start Date: {project.start_date}
            - Assigned Staff: {staff.username}
            
            Please log in to your account to view the project details and communicate with our team.
            
            Best regards,
            Construction Company Team
            '''
            send_mail(
                subject,
                message,
                settings.EMAIL_HOST_USER,
                [project.client.email],
                fail_silently=False,
            )
            
            messages.success(request, 'Inquiry accepted and staff assigned!')
            return redirect('project_detail', project_id=project_id)
    
    return render(request, 'core/accept_inquiry.html', {
        'project': project,
        'available_staff': available_staff,
    })

@login_required
@user_passes_test(lambda u: u.user_type == 'staff')
def update_project_status(request, project_id):
    project = get_object_or_404(Project, id=project_id, staff=request.user)
    
    if request.method == 'POST':
        new_status = request.POST.get('status')
        if new_status in dict(Project.STATUS_CHOICES):
            project.status = new_status
            project.save()
            
            # Send email notification to client
            subject = f'Project Status Updated - {project.service.name}'
            message = f'''
            Dear {project.client.username},
            
            The status of your project "{project.service.name}" has been updated to {project.get_status_display()}.
            
            Please log in to your account to view the updated details.
            
            Best regards,
            Construction Company Team
            '''
            send_mail(
                subject,
                message,
                settings.EMAIL_HOST_USER,
                [project.client.email],
                fail_silently=False,
            )
            
            messages.success(request, 'Project status updated successfully!')
        else:
            messages.error(request, 'Invalid status selected.')
    
    return redirect('project_detail', project_id=project_id)

@login_required
def budget_discussion(request, project_id):
    project = get_object_or_404(Project, id=project_id)
    if not (request.user == project.client or request.user == project.staff or request.user.user_type == 'admin'):
        raise PermissionDenied
    
    if request.method == 'POST':
        message = request.POST.get('message')
        document = request.FILES.get('document')
        
        discussion = BudgetDiscussion.objects.create(
            project=project,
            sender=request.user,
            message=message,
            document=document,
            is_admin_reply=request.user.user_type in ['admin', 'staff']
        )
        
        if request.user.user_type in ['admin', 'staff']:
            # Notify client about admin's reply
            send_mail(
                'New Budget Discussion Update',
                f'You have a new message regarding the budget for {project.service.name}',
                settings.EMAIL_HOST_USER,
                [project.client.email],
                fail_silently=False,
            )
        
        return redirect('budget_discussion', project_id=project.id)
    
    discussions = BudgetDiscussion.objects.filter(project=project)
    return render(request, 'core/budget_discussion.html', {
        'project': project,
        'discussions': discussions
    })

@login_required
@user_passes_test(lambda u: u.user_type == 'admin')
def add_staff(request):
    if request.method == 'POST':
        form = UserRegistrationForm(request.POST, request.FILES)
        if form.is_valid():
            user = form.save(commit=False)
            user.user_type = 'staff'
            user.save()
            messages.success(request, 'Staff member added successfully!')
            return redirect('dashboard')
    else:
        form = UserRegistrationForm()
    return render(request, 'core/add_staff.html', {'form': form})

@login_required
def profile(request):
    if request.method == 'POST':
        form = UserRegistrationForm(request.POST, request.FILES, instance=request.user)
        if form.is_valid():
            form.save()
            messages.success(request, 'Profile updated successfully!')
            return redirect('profile')
    else:
        form = UserRegistrationForm(instance=request.user)
    return render(request, 'core/profile.html', {'form': form})

@login_required
def service_list(request):
    services = Service.objects.all()
    return render(request, 'core/service_list.html', {'services': services})

@login_required
def service_detail(request, service_id):
    service = get_object_or_404(Service, id=service_id)
    return render(request, 'core/service_detail.html', {'service': service})

@login_required
def private_chat(request, recipient_id=None):
    user = request.user
    recipient = None
    messages = None
    
    # Get available chat partners based on user type
    if user.user_type == 'admin':
        # Admin can chat with everyone
        chat_partners = User.objects.exclude(id=user.id)
    elif user.user_type == 'staff':
        # Staff can chat with admin and their clients
        chat_partners = User.objects.filter(
            Q(user_type='admin') | 
            Q(user_type='client', client_projects__staff=user)
        ).distinct()
    else:  # client
        # Clients can chat with admin and their assigned staff
        chat_partners = User.objects.filter(
            Q(user_type='admin') | 
            Q(user_type='staff', staff_projects__client=user)
        ).distinct()
    
    # If a recipient is selected
    if recipient_id:
        recipient = get_object_or_404(User, id=recipient_id)
        
        # Verify permission to chat with recipient
        if user.user_type == 'admin':
            pass  # Admin can chat with anyone
        elif user.user_type == 'staff':
            if recipient.user_type not in ['admin', 'client']:
                raise PermissionDenied
        else:  # client
            if recipient.user_type not in ['admin', 'staff']:
                raise PermissionDenied
        
        # Get messages between users
        messages = Message.objects.filter(
            Q(sender=user, recipient=recipient) |
            Q(sender=recipient, recipient=user)
        ).order_by('created_at')
        
        # Mark messages as read
        messages.filter(recipient=user, is_read=False).update(is_read=True)
    
    if request.method == 'POST':
        form = MessageForm(request.POST, request.FILES)
        if form.is_valid() and recipient:
            message = form.save(commit=False)
            message.sender = user
            message.recipient = recipient
            message.save()
            
            # Send email notification
            subject = f'New Message from {user.get_full_name()}'
            message_text = f'''
            Dear {recipient.get_full_name()},
            
            You have received a new message from {user.get_full_name()}.
            
            Message: {message.content}
            
            Please log in to your account to view and respond to the message.
            
            Best regards,
            Construction Company Team
            '''
            send_mail(
                subject,
                message_text,
                settings.EMAIL_HOST_USER,
                [recipient.email],
                fail_silently=False,
            )
            
            return redirect('private_chat', recipient_id=recipient.id)
    else:
        form = MessageForm()
    
    # Add unread message counts to chat partners
    for partner in chat_partners:
        partner.unread_messages_count = Message.objects.filter(
            sender=partner,
            recipient=user,
            is_read=False
        ).count()
    
    return render(request, 'core/private_chat.html', {
        'chat_partners': chat_partners,
        'recipient': recipient,
        'messages': messages,
        'form': form,
    })

@login_required
def project_chat(request, project_id):
    project = get_object_or_404(Project, id=project_id)
    if not (request.user == project.client or request.user == project.staff or request.user.user_type == 'admin'):
        raise PermissionDenied
    
    messages = Message.objects.filter(project=project, chat_type='project').order_by('created_at')
    
    if request.method == 'POST':
        form = MessageForm(request.POST, request.FILES)
        if form.is_valid():
            message = form.save(commit=False)
            message.sender = request.user
            message.project = project
            message.chat_type = 'project'
            message.save()
            
            # Send email notification to the other party
            if request.user == project.staff:
                recipient = project.client
            elif request.user == project.client:
                recipient = project.staff
            else:  # admin
                recipient = project.client if project.staff else None
            
            if recipient:
                subject = f'New Project Message - {project.service.name}'
                message_text = f'''
                Dear {recipient.get_full_name()},
                
                You have received a new message regarding the project "{project.service.name}".
                
                Message: {message.content}
                
                Please log in to your account to view and respond to the message.
                
                Best regards,
                Construction Company Team
                '''
                send_mail(
                    subject,
                    message_text,
                    settings.EMAIL_HOST_USER,
                    [recipient.email],
                    fail_silently=False,
                )
            
            return redirect('project_chat', project_id=project.id)
    else:
        form = MessageForm()
    
    # Mark messages as read
    if request.user == project.client:
        messages.filter(is_read=False).exclude(sender=request.user).update(is_read=True)
    elif request.user == project.staff:
        messages.filter(is_read=False).exclude(sender=request.user).update(is_read=True)
    
    return render(request, 'core/project_chat.html', {
        'project': project,
        'messages': messages,
        'form': form,
    })

@login_required
@user_passes_test(lambda u: u.user_type == 'admin')
def assign_staff(request, project_id):
    project = get_object_or_404(Project, id=project_id)
    
    if request.method == 'POST':
        staff_id = request.POST.get('staff')
        if staff_id:
            staff = get_object_or_404(User, id=staff_id, user_type='staff')
            project.staff = staff
            project.save()
            
            # Send email notification to both staff and client
            subject = f'Staff Assignment - {project.service.name}'
            
            # Email to staff
            staff_message = f'''
            Dear {staff.username},
            
            You have been assigned to the project "{project.service.name}".
            
            Project Details:
            - Client: {project.client.username}
            - Budget: ${project.budget}
            - Start Date: {project.start_date}
            
            Please log in to your account to view the project details and communicate with the client.
            
            Best regards,
            Construction Company Team
            '''
            send_mail(
                subject,
                staff_message,
                settings.EMAIL_HOST_USER,
                [staff.email],
                fail_silently=False,
            )
            
            # Email to client
            client_message = f'''
            Dear {project.client.username},
            
            A staff member has been assigned to your project "{project.service.name}".
            
            Project Details:
            - Assigned Staff: {staff.username}
            - Budget: ${project.budget}
            - Start Date: {project.start_date}
            
            Please log in to your account to view the project details and communicate with our team.
            
            Best regards,
            Construction Company Team
            '''
            send_mail(
                subject,
                client_message,
                settings.EMAIL_HOST_USER,
                [project.client.email],
                fail_silently=False,
            )
            
            messages.success(request, f'Staff member {staff.username} has been assigned to the project.')
            return redirect('project_detail', project_id=project.id)
    
    available_staff = User.objects.filter(user_type='staff', is_active=True)
    return render(request, 'core/assign_staff.html', {
        'project': project,
        'available_staff': available_staff,
    })

def login_view(request):
    if request.method == 'POST':
        username = request.POST.get('username')
        password = request.POST.get('password')
        user = authenticate(request, username=username, password=password)
        
        if user is not None:
            login(request, user)
            messages.success(request, 'Successfully logged in!')
            return redirect('dashboard')
        else:
            messages.error(request, 'Invalid username or password.')
    
    return render(request, 'core/login.html')

def logout_view(request):
    logout(request)
    messages.success(request, 'Successfully logged out!')
    return redirect('home')

@login_required
def project_invoices(request, project_id=None):
    if project_id:
        project = get_object_or_404(Project, id=project_id)
        # Check if user has permission to view this project's invoices
        if not (request.user.user_type in ['admin', 'staff'] or request.user == project.client):
            raise PermissionDenied
        invoices = Invoice.objects.filter(project=project)
    else:
        # For admin and staff, show all invoices
        # For clients, show only their project invoices
        if request.user.user_type in ['admin', 'staff']:
            invoices = Invoice.objects.all()
        else:
            invoices = Invoice.objects.filter(project__client=request.user)
        project = None

    context = {
        'invoices': invoices,
        'project': project,
    }
    return render(request, 'core/invoices.html', context)

@login_required
@user_passes_test(lambda u: u.user_type in ['admin', 'staff'])
def create_invoice(request, project_id):
    project = get_object_or_404(Project, id=project_id)
    
    if request.method == 'POST':
        form = InvoiceForm(request.POST)
        if form.is_valid():
            invoice = form.save(commit=False)
            invoice.project = project
            invoice.status = 'pending'  # Set initial status
            try:
                invoice.save()
                
                # Send email notification to client
                subject = f'New Invoice Created - {project.service.name}'
                message = f'''
                Dear {project.client.get_full_name()},
                
                A new invoice has been created for your project "{project.service.name}".
                
                Invoice Details:
                - Invoice Number: {invoice.invoice_number}
                - Amount: ${invoice.amount}
                - Issue Date: {invoice.issue_date}
                - Due Date: {invoice.due_date}
                
                Please log in to your account to view the full details and make payment.
                
                Best regards,
                Construction Company Team
                '''
                send_mail(
                    subject,
                    message,
                    settings.EMAIL_HOST_USER,
                    [project.client.email],
                    fail_silently=False,
                )
                
                messages.success(request, 'Invoice created successfully!')
                return redirect('project_invoices', project_id=project.id)
            except IntegrityError:
                form.add_error('invoice_number', 'This invoice number already exists. Please choose a different one.')
    else:
        form = InvoiceForm()
    
    return render(request, 'core/create_invoice.html', {
        'form': form,
        'project': project
    })

@login_required
def invoice_detail(request, invoice_id):
    invoice = get_object_or_404(Invoice, id=invoice_id)
    if not (request.user == invoice.project.client or request.user == invoice.project.staff or request.user.user_type == 'admin'):
        raise PermissionDenied
    
    payments = Payment.objects.filter(invoice=invoice)
    total_paid = payments.aggregate(total=models.Sum('amount'))['total'] or 0
    remaining_balance = invoice.amount - total_paid
    
    return render(request, 'core/invoice_detail.html', {
        'invoice': invoice,
        'payments': payments,
        'total_paid': total_paid,
        'remaining_balance': remaining_balance
    })

@login_required
@user_passes_test(lambda u: u.user_type in ['admin', 'staff'])
def invoice_payments(request, invoice_id):
    invoice = get_object_or_404(Invoice, id=invoice_id)
    
    # Get existing payments
    payments = Payment.objects.filter(invoice=invoice).order_by('-payment_date')
    total_paid = payments.aggregate(total=models.Sum('amount'))['total'] or 0
    remaining_balance = invoice.amount - total_paid
    
    if request.method == 'POST':
        form = PaymentForm(request.POST)
        if form.is_valid():
            payment = form.save(commit=False)
            payment.invoice = invoice
            payment.recorded_by = request.user
            
            # Validate payment amount
            if payment.amount <= 0:
                messages.error(request, 'Payment amount must be greater than zero.')
                return redirect('invoice_payments', invoice_id=invoice.id)
            
            if payment.amount > remaining_balance:
                messages.error(request, f'Payment amount cannot exceed the remaining balance of ${remaining_balance}')
                return redirect('invoice_payments', invoice_id=invoice.id)
            
            try:
                payment.save()
                
                # Update invoice status if fully paid
                new_total_paid = total_paid + payment.amount
                if new_total_paid >= invoice.amount:
                    invoice.status = 'paid'
                    invoice.save()
                    
                    # Send email notification about full payment
                    subject = f'Payment Recorded for Invoice #{invoice.invoice_number}'
                    message = f'''
                    Dear {invoice.project.client.get_full_name()},
                    
                    A payment has been recorded for invoice #{invoice.invoice_number}.
                    The invoice is now fully paid.
                    
                    Payment Details:
                    - Total Amount: ${invoice.amount}
                    - Payment Date: {payment.payment_date}
                    - Payment Method: {payment.get_payment_method_display()}
                    - Recorded by: {request.user.get_full_name()}
                    
                    Thank you for your business!
                    
                    Best regards,
                    Construction Company Team
                    '''
                else:
                    # Send email notification about partial payment
                    new_remaining = invoice.amount - new_total_paid
                    subject = f'Payment Recorded for Invoice #{invoice.invoice_number}'
                    message = f'''
                    Dear {invoice.project.client.get_full_name()},
                    
                    A payment has been recorded for invoice #{invoice.invoice_number}.
                    
                    Payment Details:
                    - Amount Paid: ${payment.amount}
                    - Payment Date: {payment.payment_date}
                    - Payment Method: {payment.get_payment_method_display()}
                    - Remaining Balance: ${new_remaining}
                    - Recorded by: {request.user.get_full_name()}
                    
                    Please contact us if you have any questions about your payment.
                    
                    Best regards,
                    Construction Company Team
                    '''
                
                send_mail(
                    subject,
                    message,
                    settings.EMAIL_HOST_USER,
                    [invoice.project.client.email],
                    fail_silently=False,
                )
                
                messages.success(request, 'Payment recorded successfully.')
                return redirect('invoice_payments', invoice_id=invoice.id)
                
            except Exception as e:
                messages.error(request, f'Error recording payment: {str(e)}')
                return redirect('invoice_payments', invoice_id=invoice.id)
    else:
        # Initialize form with current date and remaining balance
        initial_data = {
            'payment_date': timezone.now().date(),
            'amount': remaining_balance if remaining_balance > 0 else None
        }
        form = PaymentForm(initial=initial_data)
    
    context = {
        'invoice': invoice,
        'payments': payments,
        'form': form,
        'total_paid': total_paid,
        'remaining_balance': remaining_balance,
    }
    
    return render(request, 'core/invoice_payments.html', context)

@login_required
def all_invoices(request):
    # Only admin and staff can view all invoices
    if not request.user.user_type in ['admin', 'staff']:
        raise PermissionDenied("You don't have permission to view all invoices.")
    
    invoices = Invoice.objects.all().order_by('-issue_date')
    return render(request, 'core/all_invoices.html', {
        'invoices': invoices
    })

@login_required
def process_payment(request, invoice_id):
    invoice = get_object_or_404(Invoice, id=invoice_id)
    
    # Only allow the client of this invoice to make payments
    if request.user != invoice.project.client:
        raise PermissionDenied("Only the client can make payments for this invoice.")
    
    # Get existing payments
    payments = Payment.objects.filter(invoice=invoice)
    total_paid = payments.aggregate(total=models.Sum('amount'))['total'] or 0
    remaining_balance = invoice.amount - total_paid
    
    if request.method == 'POST':
        form = PaymentForm(request.POST)
        if form.is_valid():
            payment = form.save(commit=False)
            payment.invoice = invoice
            
            # Validate payment amount
            if payment.amount <= 0:
                messages.error(request, 'Payment amount must be greater than zero.')
                return redirect('process_payment', invoice_id=invoice.id)
            if payment.amount > remaining_balance:
                messages.error(request, f'Payment amount cannot exceed the remaining balance of ${remaining_balance}')
                return redirect('process_payment', invoice_id=invoice.id)
            
            try:
                payment.save()
                
                # Update invoice status if fully paid
                new_total_paid = total_paid + payment.amount
                if new_total_paid >= invoice.amount:
                    invoice.status = 'paid'
                    invoice.save()
                    
                    # Send email notification about full payment
                    subject = f'Invoice #{invoice.invoice_number} Fully Paid'
                    message = f'''
                    Dear {invoice.project.client.get_full_name()},
                    
                    Your payment for invoice #{invoice.invoice_number} has been processed successfully.
                    The invoice is now fully paid.
                    
                    Payment Details:
                    - Total Amount: ${invoice.amount}
                    - Payment Date: {payment.payment_date}
                    - Payment Method: {payment.get_payment_method_display()}
                    
                    Thank you for your payment!
                    
                    Best regards,
                    Construction Company Team
                    '''
                else:
                    # Send email notification about partial payment
                    new_remaining = invoice.amount - new_total_paid
                    subject = f'Partial Payment Processed for Invoice #{invoice.invoice_number}'
                    message = f'''
                    Dear {invoice.project.client.get_full_name()},
                    
                    Your payment for invoice #{invoice.invoice_number} has been processed successfully.
                    
                    Payment Details:
                    - Amount Paid: ${payment.amount}
                    - Payment Date: {payment.payment_date}
                    - Payment Method: {payment.get_payment_method_display()}
                    - Remaining Balance: ${new_remaining}
                    
                    Please log in to your account to make additional payments or view the full details.
                    
                    Best regards,
                    Construction Company Team
                    '''
                
                send_mail(
                    subject,
                    message,
                    settings.EMAIL_HOST_USER,
                    [invoice.project.client.email],
                    fail_silently=False,
                )
                
                messages.success(request, 'Payment processed successfully.')
                return redirect('process_payment', invoice_id=invoice.id)
                
            except Exception as e:
                messages.error(request, f'Error processing payment: {str(e)}')
                return redirect('process_payment', invoice_id=invoice.id)
    else:
        # Initialize form with current date and remaining balance
        initial_data = {
            'payment_date': timezone.now().date(),
            'amount': remaining_balance if remaining_balance > 0 else None
        }
        form = PaymentForm(initial=initial_data)
    
    context = {
        'invoice': invoice,
        'payments': payments,
        'form': form,
        'total_paid': total_paid,
        'remaining_balance': remaining_balance,
    }
    
    return render(request, 'core/process_payment.html', context)

@login_required
def project_expenses(request, project_id):
    project = get_object_or_404(Project, id=project_id)
    
    # Check if user has permission to view expenses
    if not (request.user.user_type in ['admin', 'staff'] or request.user == project.client):
        raise PermissionDenied("You don't have permission to view project expenses.")
    
    # Get all expenses for this project
    expenses = Expense.objects.filter(project=project).order_by('-date')
    
    # Calculate total expenses
    total_expenses = expenses.aggregate(total=models.Sum('amount'))['total'] or 0
    
    # Handle expense form submission (admin/staff only)
    if request.method == 'POST' and request.user.user_type in ['admin', 'staff']:
        form = ExpenseForm(request.POST, request.FILES)
        if form.is_valid():
            expense = form.save(commit=False)
            expense.project = project
            expense.created_by = request.user
            expense.save()
            
            # Send email notification to client
            subject = f'New Expense Added to Project - {project.service.name}'
            message = f'''
            Dear {project.client.get_full_name()},
            
            A new expense has been added to your project "{project.service.name}".
            
            Expense Details:
            - Amount: ${expense.amount}
            - Date: {expense.date}
            - Category: {expense.get_category_display()}
            - Description: {expense.description}
            - Added by: {request.user.get_full_name()}
            
            Please log in to your account to view the full details.
            
            Best regards,
            Construction Company Team
            '''
            send_mail(
                subject,
                message,
                settings.EMAIL_HOST_USER,
                [project.client.email],
                fail_silently=False,
            )
            
            messages.success(request, 'Expense added successfully!')
            return redirect('project_expenses', project_id=project.id)
    else:
        form = ExpenseForm()
    
    context = {
        'project': project,
        'expenses': expenses,
        'total_expenses': total_expenses,
        'form': form if request.user.user_type in ['admin', 'staff'] else None,
    }
    
    return render(request, 'core/project_expenses.html', context)

@login_required
@user_passes_test(lambda u: u.user_type in ['admin', 'staff'])
def create_expense(request, project_id):
    project = get_object_or_404(Project, id=project_id)
    
    if request.method == 'POST':
        form = ExpenseForm(request.POST, request.FILES)
        if form.is_valid():
            expense = form.save(commit=False)
            expense.project = project
            expense.created_by = request.user
            expense.save()
            
            # Send email notification to client
            subject = f'New Expense Added to Project - {project.service.name}'
            message = f'''
            Dear {project.client.get_full_name()},
            
            A new expense has been added to your project "{project.service.name}".
            
            Expense Details:
            - Amount: ${expense.amount}
            - Date: {expense.date}
            - Category: {expense.get_category_display()}
            - Description: {expense.description}
            
            Please log in to your account to view the full details.
            
            Best regards,
            Construction Company Team
            '''
            send_mail(
                subject,
                message,
                settings.EMAIL_HOST_USER,
                [project.client.email],
                fail_silently=False,
            )
            
            messages.success(request, 'Expense added successfully!')
            return redirect('project_expenses', project_id=project.id)
    else:
        form = ExpenseForm()
    
    context = {
        'form': form,
        'project': project,
    }
    
    return render(request, 'core/create_expense.html', context)

@login_required
def expense_detail(request, expense_id):
    expense = get_object_or_404(Expense, id=expense_id)
    project = expense.project
    
    # Check if user has permission to view this expense
    if not (request.user.user_type in ['admin', 'staff'] or request.user == project.client):
        raise PermissionDenied("You don't have permission to view this expense.")
    
    # Handle expense update (only for staff and admin)
    if request.method == 'POST' and request.user.user_type in ['admin', 'staff']:
        form = ExpenseForm(request.POST, request.FILES, instance=expense)
        if form.is_valid():
            updated_expense = form.save()
            
            # Send email notification to client about the update
            subject = f'Expense Updated - {project.service.name}'
            message = f'''
            Dear {project.client.get_full_name()},
            
            An expense for your project "{project.service.name}" has been updated.
            
            Updated Expense Details:
            - Amount: ${updated_expense.amount}
            - Date: {updated_expense.date}
            - Category: {updated_expense.get_category_display()}
            - Description: {updated_expense.description}
            
            Please log in to your account to view the full details.
            
            Best regards,
            Construction Company Team
            '''
            send_mail(
                subject,
                message,
                settings.EMAIL_HOST_USER,
                [project.client.email],
                fail_silently=False,
            )
            
            messages.success(request, 'Expense updated successfully!')
            return redirect('expense_detail', expense_id=expense.id)
    else:
        form = ExpenseForm(instance=expense)
    
    context = {
        'expense': expense,
        'project': project,
        'form': form if request.user.user_type in ['admin', 'staff'] else None,
    }
    
    return render(request, 'core/expense_detail.html', context)

@login_required
def project_reports(request, project_id):
    project = get_object_or_404(Project, id=project_id)
    
    # Check if user has permission to view reports
    if not (request.user.user_type in ['admin', 'staff'] or request.user == project.client):
        raise PermissionDenied("You don't have permission to view project reports.")
    
    # Get all reports for this project
    reports = FinancialReport.objects.filter(project=project).order_by('-created_at')
    
    # Calculate financial summary
    total_invoices = Invoice.objects.filter(project=project).aggregate(total=models.Sum('amount'))['total'] or 0
    total_payments = Payment.objects.filter(invoice__project=project).aggregate(total=models.Sum('amount'))['total'] or 0
    total_expenses = Expense.objects.filter(project=project).aggregate(total=models.Sum('amount'))['total'] or 0
    net_profit = total_payments - total_expenses
    
    # Handle report creation (only for staff and admin)
    if request.method == 'POST' and request.user.user_type in ['admin', 'staff']:
        form = FinancialReportForm(request.POST, request.FILES)
        if form.is_valid():
            report = form.save(commit=False)
            report.project = project
            report.created_by = request.user
            report.save()
            
            # Send email notification to client
            subject = f'New Financial Report - {project.service.name}'
            message = f'''
            Dear {project.client.get_full_name()},
            
            A new financial report has been generated for your project "{project.service.name}".
            
            Report Details:
            - Type: {report.get_report_type_display()}
            - Period: {report.start_date} to {report.end_date}
            - Notes: {report.notes}
            
            Please log in to your account to view the full report.
            
            Best regards,
            Construction Company Team
            '''
            send_mail(
                subject,
                message,
                settings.EMAIL_HOST_USER,
                [project.client.email],
                fail_silently=False,
            )
            
            messages.success(request, 'Financial report created successfully!')
            return redirect('project_reports', project_id=project.id)
    else:
        form = FinancialReportForm()
    
    context = {
        'project': project,
        'reports': reports,
        'total_invoices': total_invoices,
        'total_payments': total_payments,
        'total_expenses': total_expenses,
        'net_profit': net_profit,
        'form': form if request.user.user_type in ['admin', 'staff'] else None,
    }
    
    return render(request, 'core/project_reports.html', context)

@login_required
@user_passes_test(lambda u: u.user_type in ['admin', 'staff'])
def create_report(request, project_id):
    project = get_object_or_404(Project, id=project_id)
    
    if request.method == 'POST':
        form = FinancialReportForm(request.POST, request.FILES)
        if form.is_valid():
            report = form.save(commit=False)
            report.project = project
            report.created_by = request.user
            
            # Calculate financial metrics for the report
            report.total_invoices = Invoice.objects.filter(
                project=project,
                issue_date__range=[report.start_date, report.end_date]
            ).aggregate(total=models.Sum('amount'))['total'] or 0
            
            report.total_payments = Payment.objects.filter(
                invoice__project=project,
                payment_date__range=[report.start_date, report.end_date]
            ).aggregate(total=models.Sum('amount'))['total'] or 0
            
            report.total_expenses = Expense.objects.filter(
                project=project,
                date__range=[report.start_date, report.end_date]
            ).aggregate(total=models.Sum('amount'))['total'] or 0
            
            report.net_profit = report.total_payments - report.total_expenses
            
            report.save()
            
            # Send email notification to client
            subject = f'New Financial Report - {project.service.name}'
            message = f'''
            Dear {project.client.get_full_name()},
            
            A new financial report has been generated for your project "{project.service.name}".
            
            Report Details:
            - Type: {report.get_report_type_display()}
            - Period: {report.start_date} to {report.end_date}
            - Notes: {report.notes}
            
            Please log in to your account to view the full report.
            
            Best regards,
            Construction Company Team
            '''
            send_mail(
                subject,
                message,
                settings.EMAIL_HOST_USER,
                [project.client.email],
                fail_silently=False,
            )
            
            messages.success(request, 'Financial report created successfully!')
            return redirect('project_reports', project_id=project.id)
    else:
        form = FinancialReportForm()
    
    context = {
        'form': form,
        'project': project,
    }
    
    return render(request, 'core/create_report.html', context)

@login_required
def report_detail(request, report_id):
    report = get_object_or_404(FinancialReport, id=report_id)
    project = report.project
    
    # Check if user has permission to view this report
    if not (request.user.user_type in ['admin', 'staff'] or request.user == project.client):
        raise PermissionDenied("You don't have permission to view this report.")
    
    # Get detailed financial data for the report period
    invoices = Invoice.objects.filter(
        project=project,
        issue_date__range=[report.start_date, report.end_date]
    )
    
    payments = Payment.objects.filter(
        invoice__project=project,
        payment_date__range=[report.start_date, report.end_date]
    )
    
    expenses = Expense.objects.filter(
        project=project,
        date__range=[report.start_date, report.end_date]
    )
    
    # Calculate additional metrics
    total_invoices = invoices.aggregate(total=models.Sum('amount'))['total'] or 0
    total_payments = payments.aggregate(total=models.Sum('amount'))['total'] or 0
    total_expenses = expenses.aggregate(total=models.Sum('amount'))['total'] or 0
    net_profit = total_payments - total_expenses
    
    # Get payment status summary
    paid_invoices = invoices.filter(status='paid').count()
    pending_invoices = invoices.filter(status='pending').count()
    overdue_invoices = invoices.filter(status='overdue').count()
    
    # Get expense categories summary
    expense_categories = expenses.values('category').annotate(
        total=models.Sum('amount')
    ).order_by('-total')
    
    context = {
        'report': report,
        'project': project,
        'invoices': invoices,
        'payments': payments,
        'expenses': expenses,
        'total_invoices': total_invoices,
        'total_payments': total_payments,
        'total_expenses': total_expenses,
        'net_profit': net_profit,
        'paid_invoices': paid_invoices,
        'pending_invoices': pending_invoices,
        'overdue_invoices': overdue_invoices,
        'expense_categories': expense_categories,
    }
    
    return render(request, 'core/report_detail.html', context)

@login_required
@user_passes_test(lambda u: u.user_type in ['admin', 'staff'])
def edit_invoice(request, invoice_id):
    invoice = get_object_or_404(Invoice, id=invoice_id)
    
    if request.method == 'POST':
        form = InvoiceForm(request.POST, instance=invoice)
        if form.is_valid():
            updated_invoice = form.save()
            
            # Send email notification to client about the update
            subject = f'Invoice #{updated_invoice.invoice_number} Updated'
            message = f'''
            Dear {updated_invoice.project.client.get_full_name()},
            
            Your invoice #{updated_invoice.invoice_number} has been updated.
            
            Updated Details:
            - Amount: ${updated_invoice.amount}
            - Due Date: {updated_invoice.due_date}
            - Status: {updated_invoice.get_status_display()}
            
            Please log in to your account to view the full details.
            
            Best regards,
            Construction Company Team
            '''
            send_mail(
                subject,
                message,
                settings.EMAIL_HOST_USER,
                [updated_invoice.project.client.email],
                fail_silently=False,
            )
            
            messages.success(request, 'Invoice updated successfully!')
            return redirect('invoice_detail', invoice_id=invoice.id)
    else:
        form = InvoiceForm(instance=invoice)
    
    context = {
        'form': form,
        'invoice': invoice,
        'project': invoice.project,
    }
    
    return render(request, 'core/edit_invoice.html', context)

@login_required
@user_passes_test(lambda u: u.user_type == 'staff')
def reschedule_meeting(request, meeting_id):
    meeting = get_object_or_404(Meeting, id=meeting_id)
    
    # Check if the staff member is assigned to the project
    if request.user != meeting.project.staff and request.user.user_type != 'admin':
        raise PermissionDenied("You don't have permission to reschedule this meeting.")
    
    if request.method == 'POST':
        form = MeetingForm(request.POST, instance=meeting)
        if form.is_valid():
            updated_meeting = form.save()
            
            # Send email notification to both parties
            subject = f'Meeting Rescheduled - {meeting.project.service.name}'
            
            # Email to client
            client_message = f'''
            Dear {meeting.project.client.get_full_name()},
            
            The meeting for your project "{meeting.project.service.name}" has been rescheduled by {request.user.get_full_name()}.
            
            Updated Meeting Details:
            - Date & Time: {updated_meeting.date_time}
            - Location: {updated_meeting.location}
            - Agenda: {updated_meeting.agenda}
            
            Please log in to your account to view the full details.
            
            Best regards,
            Construction Company Team
            '''
            
            # Email to staff
            staff_message = f'''
            Dear {meeting.project.staff.get_full_name()},
            
            The meeting for project "{meeting.project.service.name}" has been rescheduled by {request.user.get_full_name()}.
            
            Updated Meeting Details:
            - Date & Time: {updated_meeting.date_time}
            - Location: {updated_meeting.location}
            - Agenda: {updated_meeting.agenda}
            
            Please log in to your account to view the full details.
            
            Best regards,
            Construction Company Team
            '''
            
            # Send emails
            send_mail(
                subject,
                client_message,
                settings.EMAIL_HOST_USER,
                [meeting.project.client.email],
                fail_silently=False,
            )
            
            send_mail(
                subject,
                staff_message,
                settings.EMAIL_HOST_USER,
                [meeting.project.staff.email],
                fail_silently=False,
            )
            
            messages.success(request, 'Meeting rescheduled successfully!')
            return redirect('project_detail', project_id=meeting.project.id)
    else:
        form = MeetingForm(instance=meeting)
    
    return render(request, 'core/reschedule_meeting.html', {
        'form': form,
        'meeting': meeting,
        'project': meeting.project,
    })
