from django import forms
from django.contrib.auth.forms import UserCreationForm, AuthenticationForm
from .models import *


class RegisterForm(UserCreationForm):
    email = forms.EmailField(widget=forms.EmailInput(attrs={'placeholder': 'Email'}), label='')

    class Meta:
        model = User  # Use the correct user model
        fields = ['username', 'email', 'password1', 'password2']

    def save(self, commit=True):
        user = super().save(commit=False)
        user.usertype = "user"  # Set default user type
        if commit:
            user.save()
        return user

class LoginForm(forms.Form):
    username = forms.CharField(max_length=100,widget=forms.TextInput(attrs={'placeholder':'Username '}),label='')
    password = forms.CharField(widget=forms.PasswordInput(attrs={'placeholder':'Password'}),label='')


class ServiceCategoryForm(forms.ModelForm):
    class Meta:
        model = ServiceCategory
        fields = ['name','image']

class ServiceForm(forms.ModelForm):
    class Meta:
        model = Service
        fields = ['name', 'image', 'description']

class EnquiryForm(forms.ModelForm):
    name = forms.CharField(max_length=100,widget=forms.TextInput(attrs={'placeholder': 'Name'}),label='')
    email = forms.EmailField(widget=forms.EmailInput(attrs={'placeholder': 'Email Address'}),label='')
    phone = forms.CharField(max_length=12,widget=forms.TextInput(attrs={'placeholder': 'Phone Number'}),label='')
    budget_range = forms.CharField(max_length=50,widget=forms.TextInput(attrs={'placeholder': 'Budget Range'}),label='')
    desired_start_date = forms.DateField(widget=forms.DateInput(attrs={'type': 'date','data-placeholder': 'Desired Start Date'}),label='')
    service = forms.ModelChoiceField(queryset=Service.objects.all(),empty_label='Select a service',widget=forms.Select(attrs={'class': 'service-dropdown'}),label='')

    desired_style = forms.CharField(max_length=100,widget=forms.TextInput(attrs={'placeholder': 'Desired Style'}),label='')
    estimated_square_footage = forms.CharField(max_length=100,widget=forms.TextInput(attrs={'placeholder': 'Estimated Square Footage'}),label='')
    message = forms.CharField(widget=forms.Textarea(attrs={'placeholder': 'Message'}),label='')

    class Meta:
        model = Enquiry
        fields = ['name', 'email', 'phone', 'service', 'budget_range', 'desired_start_date', 'desired_style', 'estimated_square_footage', 'message']


class StaffForm(forms.ModelForm):
    password = forms.CharField(widget=forms.PasswordInput(), help_text="Enter a secure password")
    date_joined = forms.DateField(widget=forms.DateInput(attrs={'type': 'date'}))

    class Meta:
        model = User
        fields = ['profile_pic', 'username', 'password', 'first_name', 'last_name', 'email', 'phone', 'role', 'department', 'experience', 'date_joined']

    def save(self, commit=True):
        staff = super().save(commit=False)
        staff.password = make_password(self.cleaned_data['password'])  # Hash password
        staff.usertype = "staff"
        if commit:
            staff.save()
        return staff

class ReplyForm(forms.Form):
    email = forms.EmailField(widget=forms.EmailInput(attrs={'readonly': 'readonly'}))
    subject = forms.CharField(widget=forms.TextInput(attrs={'placeholder': 'Subject'}))
    message = forms.CharField(widget=forms.Textarea(attrs={'placeholder': 'Your message'}))




class ProjectForm(forms.ModelForm):
    assigned_staff = forms.ModelMultipleChoiceField(
        queryset=User.objects.filter(is_staff=True, is_active=True,is_superuser=False),
        widget=forms.SelectMultiple(attrs={'class': 'form-control'}),
        required=True
    )

    class Meta:
        model = Project
        fields = ['title', 'description', 'start_date', 'expected_end_date', 'status', 'assigned_staff']
        widgets = {
            'title': forms.TextInput(attrs={'class': 'form-control'}),
            'description': forms.Textarea(attrs={'class': 'form-control', 'rows': 4}),
            'start_date': forms.DateInput(attrs={'class': 'form-control', 'type': 'date'}),
            'expected_end_date': forms.DateInput(attrs={'class': 'form-control', 'type': 'date'}),
            'status': forms.Select(attrs={'class': 'form-control'}),
        }



class StaffRegistrationForm(UserCreationForm):
    email = forms.EmailField(required=True)
    first_name = forms.CharField(required=True)
    last_name = forms.CharField(required=True)
    phone = forms.CharField(required=True)
    role = forms.ChoiceField(choices=User.ROLE_CHOICES)

    class Meta:
        model = User
        fields = ('username', 'email', 'first_name', 'last_name', 'phone', 'password1', 'password2', 'role')

    def save(self, commit=True):
        user = super().save(commit=False)
        user.email = self.cleaned_data['email']
        user.first_name = self.cleaned_data['first_name']
        user.last_name = self.cleaned_data['last_name']
        user.phone = self.cleaned_data['phone']
        user.role = self.cleaned_data['role']
        user.is_staff = True
        
        if commit:
            user.save()
        return user 