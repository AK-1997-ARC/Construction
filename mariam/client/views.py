from django.shortcuts import render,get_object_or_404,redirect
from django.contrib.auth.decorators import login_required
from core.models import Enquiry
from django.contrib.auth.decorators import login_required
from django.contrib.admin.views.decorators import staff_member_required
from core.models import *
from core.forms import *
from django.contrib import messages
from django.utils import timezone
from datetime import timedelta
# Create your views here.
def index1(request):
    return render(request,'index1.html')

@login_required
def dashboard_view(request):
    enquiries = Enquiry.objects.filter(user=request.user).select_related('service')
    enquiries = Enquiry.objects.filter(user=request.user)
    email_enquiries = Enquiry.objects.filter(email=request.user.email)
    all_enquiries = enquiries | email_enquiries
    return render(request, 'enquiry.html', {'enquiries': all_enquiries})

@login_required
def add_staff(request):
    if not request.user.is_staff:
        messages.error(request, "You don't have permission to add staff.")
        return redirect('dashboard')
    
    if request.method == 'POST':
        form = StaffRegistrationForm(request.POST)
        if form.is_valid():
            user = form.save(commit = False)
            
            user.usertype = "staff"
            user.save()
            messages.success(request, f'Staff member {user.get_full_name()} has been added successfully.')
            
            # Send welcome email
            send_mail(
                'Welcome to Our Team',
                f'Hello {user.get_full_name()},\n\nYou have been added as a staff member. Your login credentials are:\n\nUsername: {user.username}\n\nPlease change your password after first login.\n\nBest regards,\nAdmin Team',
                settings.DEFAULT_FROM_EMAIL,
                [user.email],
                fail_silently=False,
            )
            
            return redirect('manage_staff')
    else:
        form = StaffRegistrationForm()
    
    return render(request, 'add_staff.html', {'form': form})



@login_required
def admin_dashboard(request):
    if not request.user.is_superuser:
        messages.error(request, "You don't have permission to access the admin dashboard.")
        return redirect('dashboard')
    
    # Get statistics for the admin dashboard
    total_projects = Project.objects.all()
    total_enquiries = Enquiry.objects.all()
    total_staff = User.objects.filter(is_staff=True, is_superuser=False)
    total_users = User.objects.filter(is_staff=False, is_superuser=False)
    print(total_enquiries,total_projects,total_staff)
    # Get recent projects
    recent_projects = Project.objects.order_by('-created_at')[:5]
    
    # Get recent enquiries
    recent_enquiries = Enquiry.objects.order_by('-desired_start_date')[:5]
    
    # Get pending enquiries
    pending_enquiries = User.objects.filter(is_staff=True,is_superuser=False)
    
    context = {
        'total_projects': total_projects,
        'total_enquiries': total_enquiries,
        'total_staff': total_staff,
        'total_users': total_users,
        'recent_projects': recent_projects,
        'recent_enquiries': recent_enquiries,
        'pending_enquiries': pending_enquiries,
    }
    
    return render(request, 'admin_dashboard_1.html', context)



@login_required
def convert_to_project(request, pk):
    if not request.user.is_staff:
        messages.error(request, "You don't have permission to convert enquiries to projects.")
        return redirect('dashboard')
    
    enquiry = get_object_or_404(Enquiry, pk=pk)
    
    if request.method == 'POST':
        form = ProjectForm(request.POST)
        if form.is_valid():
            project = form.save(commit=False)
            project.user = enquiry.user
            project.enquiry = enquiry
            project.save()
            form.save_m2m()  # Save the many-to-many relationships
            
            # Update enquiry status
            enquiry.status = 'converted'
            enquiry.is_converted = True
            enquiry.save()
            
            messages.success(request, 'Project created successfully.')
            return redirect('project_detail', pk=project.pk)
    else:
        initial_data = {
            'title': f"Project for {enquiry.service.name}",
            'description': enquiry.message,
            'start_date': timezone.now().date(),
            'expected_end_date': timezone.now().date() + timedelta(days=30),
            'status': 'in_progress'
        }
        form = ProjectForm(initial=initial_data)
    
    return render(request, 'convert_to_project.html', {
        'form': form,
        'enquiry': enquiry
    })





@staff_member_required
def update_enquiry_status(request, pk):
    enquiry = get_object_or_404(Enquiry, pk=pk)
    if request.method == 'POST':
        new_status = request.POST.get('status')
        enquiry.status = new_status
        enquiry.save()
        
        if new_status == 'accepted':
            # Try to find a user with the same email
            try:
                user = User.objects.get(email=enquiry.email)
                enquiry.user = user
                enquiry.save()
            except User.DoesNotExist:
                pass
            
            # Send email to the user
            subject = 'Your Enquiry Has Been Accepted'
            message = f'''
            Dear {enquiry.name},
            
            Your enquiry for {enquiry.service.name} has been accepted.
            Please register on our website to view your enquiry status and communicate with us.
            
            Best regards,
            Construction Services Team
            '''
            send_mail(
                subject,
                message,
                settings.DEFAULT_FROM_EMAIL,
                [enquiry.email],
                fail_silently=False,
            )
            messages.success(request, 'Enquiry status updated and email sent to the user.')
        else:
            messages.success(request, 'Enquiry status updated.')
        
        return redirect('dashboard')
    
    return render(request, 'update_status.html', {'enquiry': enquiry})

@login_required
def manage_staff(request):
    if not request.user.is_staff:
        messages.error(request, "You don't have permission to manage staff.")
        return redirect('dashboard')
    
    staff_members = User.objects.filter(is_staff=True,is_superuser=False)
    return render(request, 'manage_staff.html', {'staff_members': staff_members})

@login_required
def edit_staff(request, pk):
    if not request.user.is_staff:
        messages.error(request, "You don't have permission to edit staff.")
        return redirect('dashboard')
    
    staff = get_object_or_404(User, pk=pk)
    if request.method == 'POST':
        form = StaffRegistrationForm(request.POST, instance=staff)
        if form.is_valid():
            form.save()
            messages.success(request, 'Staff member updated successfully.')
            return redirect('manage_staff')
    else:
        form = StaffRegistrationForm(instance=staff)
    
    return render(request, 'edit_staff.html', {'form': form, 'staff': staff})

@login_required
def activate_staff(request, pk):
    if not request.user.is_staff:
        messages.error(request, "You don't have permission to activate staff.")
        return redirect('dashboard')
    
    staff = get_object_or_404(User, pk=pk)
    staff.is_active = True
    staff.save()
    messages.success(request, f'{staff.get_full_name()} has been activated.')
    return redirect('manage_staff')

@login_required
def deactivate_staff(request, pk):
    if not request.user.is_staff:
        messages.error(request, "You don't have permission to deactivate staff.")
        return redirect('dashboard')
    
    staff = get_object_or_404(User, pk=pk)
    staff.is_active = False
    staff.save()
    messages.success(request, f'{staff.get_full_name()} has been deactivated.')
    return redirect('manage_staff')

@login_required
def update_enquiry(request, pk):
    if not request.user.is_staff:
        messages.error(request, "You don't have permission to update enquiries.")
        return redirect('dashboard')
    
    enquiry = get_object_or_404(Enquiry, pk=pk)
    if request.method == 'POST':
        form = EnquiryForm(request.POST, instance=enquiry)
        if form.is_valid():
            enquiry = form.save()
            if enquiry.status == 'accepted':
                # Send email notification
                send_mail(
                    'Enquiry Accepted',
                    f'Your enquiry has been accepted. We will contact you soon.',
                    settings.DEFAULT_FROM_EMAIL,
                    [enquiry.email],
                    fail_silently=False,
                )
            messages.success(request, 'Enquiry updated successfully.')
            return redirect('dashboard')
    else:
        form = EnquiryForm(instance=enquiry)
    
    return render(request, 'enquiry_update.html', {'form': form, 'enquiry': enquiry})

@login_required
def project_list(request):
    if request.user.is_staff:
        projects = Project.objects.all()
    else:
        projects = Project.objects.filter(user=request.user)
    return render(request, 'project_list.html', {'projects': projects})

@login_required
def project_detail(request, pk):
    project = get_object_or_404(Project, pk=pk)
    if not request.user.is_staff and project.user != request.user:
        messages.error(request, "You don't have permission to view this project.")
        return redirect('dashboard')
    return render(request, 'project_detail.html', {'project': project})

@login_required
def update_project(request, pk):
    if not request.user.is_staff:
        messages.error(request, "You don't have permission to update projects.")
        return redirect('dashboard')
    
    project = get_object_or_404(Project, pk=pk)
    if request.method == 'POST':
        form = ProjectForm(request.POST, instance=project)
        if form.is_valid():
            project = form.save()
            messages.success(request, 'Project updated successfully.')
            return redirect('project_detail', pk=project.pk)
    else:
        form = ProjectForm(instance=project)
    
    return render(request, 'update_project.html', {'form': form, 'project': project})

@login_required
def staff_dashboard(request):
    if not request.user.is_staff:
        messages.error(request, "You don't have permission to access staff dashboard.")
        return redirect('dashboard')
    
    # Get all projects assigned to the staff member
    projects = Project.objects.filter(assigned_staff=request.user)
    
    # Get all enquiries that haven't been converted to projects
    enquiries = Enquiry.objects.filter(status='pending')
    
    return render(request, 'staff_dashboard.html', {
        'projects': projects,
        'enquiries': enquiries
    })

@login_required
def staff_projects(request):
    if not request.user.is_staff:
        messages.error(request, "You don't have permission to view staff projects.")
        return redirect('dashboard')
    
    projects = Project.objects.filter(assigned_staff=request.user)
    return render(request, 'staff_projects.html', {'projects': projects})

@login_required
def staff_project_detail(request, pk):
    if not request.user.is_staff:
        messages.error(request, "You don't have permission to view staff project details.")
        return redirect('dashboard')
    
    project = get_object_or_404(Project, pk=pk, assigned_staff=request.user)
    return render(request, 'staff_project_detail.html', {'project': project})
