from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth import login, authenticate, logout
from django.http import HttpResponse
from .forms import *
from .models import *
from django.conf import settings
from django.contrib import messages
from django.core.mail import send_mail

def index(request):
    form = EnquiryForm(request.POST or None)
    print(request.method == 'POST')
    
    
    categories = ServiceCategory.objects.all()  # plural, it's a queryset
    services = Service.objects.all() 
    form = EnquiryForm()
    print(services)
    print(categories)
    return render(request,'index.html', {'category': categories, 'services': services})


def register(request):
    if request.user.is_authenticated:
        return redirect('/')
    if request.method == 'POST':
        form = RegisterForm(request.POST)
        if form.is_valid():
            user=form.save(commit=False)
            user.usertype="user"
            user.save()
            return redirect('login')
    else:
        form = RegisterForm()
    return render(request, 'register.html', {'form': form})



def login_view(request):
    if request.method == 'POST':
        form = LoginForm(request.POST)

        if form.is_valid():
            username = form.cleaned_data['username']
            password = form.cleaned_data['password']
            
            print(f"DEBUG: Attempting login for username: {username}")  # Debugging
            
            user = authenticate(request, username=username, password=password)

            if user is not None:
                print(f"DEBUG: Authentication successful for user {username}")  # Debugging
                login(request, user)
                
                data = User.objects.get(username=username)
                request.session['ut'] = data.usertype
                
                if data.usertype == "admin":
                    return redirect('/admin_dashboard_page')

                elif data.usertype == "staff":
                    return redirect('/admin_dashboard_page')

                elif data.usertype == "user":
                    return redirect('/index1')

                else:
                    return redirect('/')
            else:
                print("DEBUG: Authentication failed. Invalid credentials")  # Debugging
                form.add_error(None, "Invalid credentials")
        else:
            print("DEBUG: Form validation failed")
            print(form.errors)
    else:
        form = LoginForm()
        return render(request, 'login.html', {'form': form})

def logout_view(request):
    logout(request)
    return redirect('/') 

def admin_dashboard_view(request):
    return render(request,'admin_dashboard.html')

def admin_client_view(request):
    return render(request,'admin_client.html')   

def admin_content_view(request):
    return render(request,'admin_content.html')

def admin_service_content_view(request):
    return render(request,'admin_service_content.html')
    
def admin_communication_view(request):
    return render(request,'admin_communication.html')

def admin_project_view(request):
    return render(request,'admin_project.html')

def admin_staff_view(request):
    return render(request,'admin_staff.html')    

def admin_analytics_view(request):
    return render(request,'admin_analytics.html')    

def service_categories(request):
    categories = ServiceCategory.objects.all()
    return render(request, 'services.html', {'categories': categories})


def services_list(request, category_id):
    form = EnquiryForm(request.POST or None)
    print(request.method == 'POST')
    if request.method == 'POST'  :
        print(form.is_valid())
        if form.is_valid():
            print(form.cleaned_data['service'],"servicesssssss")
            ser = form.save(commit=False)
            ser.save()
            messages.success(request, "Thank you for your inquiry! We will get back to you soon.")

        else:
            print(form.errors)

    category = get_object_or_404(ServiceCategory, id=category_id)
    services = Service.objects.filter(category=category)
    form = EnquiryForm()
    return render(request, 'services_list.html', {'category': category, 'services': services, 'form': form})




def service_category_list(request):
    categories = ServiceCategory.objects.all()
    return render(request, 'service_category_list.html', {'categories': categories})

def service_list(request, category_id):
    category = get_object_or_404(ServiceCategory, id=category_id)
    services = category.services.all()
    return render(request, 'service_list.html', {'category': category, 'services': services})


def add_service_category(request):
    if request.method == 'POST':
        form = ServiceCategoryForm(request.POST, request.FILES)
        if form.is_valid():
            form.save()
            return redirect('service_category_list')
    else:
        form = ServiceCategoryForm()
    return render(request, 'add_service_category.html', {'form': form})


def edit_service_category(request, category_id):
    category = get_object_or_404(ServiceCategory, id=category_id)
    if request.method == 'POST':
        form = ServiceCategoryForm(request.POST, request.FILES, instance=category)
        if form.is_valid():
            form.save()
            return redirect('service_category_list')
    else:
        form = ServiceCategoryForm(instance=category)
    return render(request, 'edit_service_category.html', {'form': form})


def delete_service_category(request, category_id):
    category = get_object_or_404(ServiceCategory, id=category_id)
    category.delete()
    return redirect('service_category_list')


def add_service(request, category_id):
    category = get_object_or_404(ServiceCategory, id=category_id)
    if request.method == 'POST':
        form = ServiceForm(request.POST, request.FILES)
        if form.is_valid():
            service = form.save(commit=False)
            service.category = category
            service.save()
            return redirect('service_list', category_id=category.id)
    else:
        form = ServiceForm()
    return render(request, 'add_service.html', {'form': form, 'category': category})


def edit_service(request, service_id):
    service = get_object_or_404(Service, id=service_id)
    if request.method == 'POST':
        form = ServiceForm(request.POST, request.FILES, instance=service)
        if form.is_valid():
            form.save()
            return redirect('service_list', category_id=service.category.id)
    else:
        form = ServiceForm(instance=service)
    return render(request, 'edit_service.html', {'form': form, 'service': service})


def delete_service(request, service_id):
    service = get_object_or_404(Service, id=service_id)
    category_id = service.category.id
    service.delete()
    return redirect('service_list', category_id=category_id)


def staff_list(request):
    staff = User.objects.filter(usertype="staff")
    return render(request, 'staff_list.html', {'staff': staff})


def staff_create(request):
    if request.method == "POST":
        form = StaffForm(request.POST,request.FILES)
        if form.is_valid():
            staff=form.save(commit=False)
            staff.usertype="staff"
            staff.password = make_password(form.cleaned_data['password'])
            staff.save()
            return redirect('staff_list')
    else:
        form = StaffForm()
    return render(request, 'staff_form.html', {'form': form, 'title': "Add Staff Member"})


def staff_update(request, staff_id):
    staff = get_object_or_404(User, id=staff_id)
    if request.method == "POST":
        form = StaffForm(request.POST,request.FILES, instance=staff)
        if form.is_valid():
            form.save()
            return redirect('staff_list')
    else:
        form = StaffForm(instance=staff)
    return render(request, 'staff_form.html', {'form': form, 'title': "Edit Staff Member"})


def staff_delete(request, staff_id):
    staff = get_object_or_404(User, id=staff_id)
    if request.method == "POST":
        staff.delete()
        return redirect('staff_list')
    else:
        return redirect('staff_list')

def enquiry_list(request):
    enquiries = Enquiry.objects.all().order_by('-id')
    return render(request, 'enquiry_list.html', {'enquiries': enquiries})

def reply_email(request, enquiry_id):
    enquiry = get_object_or_404(Enquiry, id=enquiry_id)
    
    if request.method == 'POST':


        form = ReplyForm(request.POST)
        if form.is_valid():
            subject = form.cleaned_data['subject']
            message = form.cleaned_data['message']
            recipient = enquiry.email
            enquiry.response=message
            enquiry.save()

            send_mail(
                subject,
                message,
                settings.EMAIL_HOST_USER,  # Replace with your email
                [recipient],
                fail_silently=False,
                )
            messages.success(request, "Reply sent successfully!")
            return redirect('enquiry_list')

        else:
            form = ReplyForm(initial={'email': enquiry.email})
        
    return render(request, 'reply_email.html', {'form': form, 'enquiry': enquiry})

    

def update_status(request, enquiry_id):
    enquiry = get_object_or_404(Enquiry, id=enquiry_id)
    print(enquiry,enquiry.id,"h8yhyf")
    print(request.method == 'POST')
    if request.method == 'POST':
        status = request.POST.get('status')
        print(status)
        enquiry.status = status
        enquiry.save()
        print(enquiry)
        messages.success(request, "Enquiry status updated successfully!")
        return redirect('enquiry_list')

    return render(request, 'enquirt_list.html', {'enquiry': enquiry})           




  
def staff_project_view(request):
    return render(request,'staff_project.html')   


def staff_task_view(request):
    return render(request,'staff_task.html')   


def staff_client_view(request):
    return render(request,'staff_client.html')


def staff_document_view(request):
    return render(request,'staff_document.html') 


def staff_updates_view(request):
    return render(request,'staff_updates.html')


def staff_resources_view(request):
    return render(request,'staff_resources.html')  
      