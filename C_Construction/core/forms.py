from django import forms
from django.contrib.auth.forms import UserCreationForm
from .models import User, ServiceCategory, Service, Project, Message, Meeting, Invoice, Payment, Expense, FinancialReport

class UserRegistrationForm(UserCreationForm):
    user_type = forms.ChoiceField(choices=User.USER_TYPE_CHOICES)
    phone_number = forms.CharField(max_length=15, required=False)
    profile_picture = forms.ImageField(required=False)

    class Meta:
        model = User
        fields = ['username', 'email', 'password1', 'password2', 'user_type', 'phone_number', 'profile_picture']

class AddStaffForm(UserCreationForm):
    phone_number = forms.CharField(max_length=15, required=False)
    profile_picture = forms.ImageField(required=False)

    class Meta:
        model = User
        fields = ['username', 'email', 'password1', 'password2', 'phone_number', 'profile_picture']

    def save(self, commit=True):
        user = super().save(commit=False)
        user.user_type = 'staff'
        if commit:
            user.save()
        return user

class AssignStaffForm(forms.ModelForm):
    class Meta:
        model = Project
        fields = ['staff']

class ProjectMessageForm(forms.ModelForm):
    class Meta:
        model = Message
        fields = ['content', 'file']
        widgets = {
            'content': forms.Textarea(attrs={'rows': 3}),
        }

class BillingMessageForm(forms.ModelForm):
    invoice_amount = forms.DecimalField(max_digits=10, decimal_places=2, required=True)
    due_date = forms.DateField(widget=forms.DateInput(attrs={'type': 'date'}), required=True)

    class Meta:
        model = Message
        fields = ['content', 'file', 'invoice_amount', 'due_date']
        widgets = {
            'content': forms.Textarea(attrs={'rows': 3}),
        }

class ServiceCategoryForm(forms.ModelForm):
    class Meta:
        model = ServiceCategory
        fields = ['name', 'description']

class ServiceForm(forms.ModelForm):
    class Meta:
        model = Service
        fields = ['category', 'name', 'description', 'price']

class ProjectForm(forms.ModelForm):
    class Meta:
        model = Project
        fields = ['service', 'client', 'staff', 'budget', 'start_date', 'end_date']

class MessageForm(forms.ModelForm):
    class Meta:
        model = Message
        fields = ['content', 'file']
        widgets = {
            'content': forms.Textarea(attrs={
                'class': 'form-control',
                'rows': 3,
                'placeholder': 'Type your message here...'
            }),
            'file': forms.FileInput(attrs={
                'class': 'form-control'
            })
        }

class MeetingForm(forms.ModelForm):
    class Meta:
        model = Meeting
        fields = ['date_time', 'location', 'agenda']
        widgets = {
            'date_time': forms.DateTimeInput(attrs={'type': 'datetime-local'}),
        }

class ProjectInquiryForm(forms.ModelForm):
    class Meta:
        model = Project
        fields = ['service', 'budget', 'start_date']
        widgets = {
            'start_date': forms.DateInput(attrs={'type': 'date'}),
            'budget': forms.NumberInput(attrs={'min': '0', 'step': '0.01'}),
        }

class InvoiceForm(forms.ModelForm):
    class Meta:
        model = Invoice
        fields = ['invoice_number', 'amount', 'issue_date', 'due_date', 'description']
        widgets = {
            'issue_date': forms.DateInput(attrs={'type': 'date'}),
            'due_date': forms.DateInput(attrs={'type': 'date'}),
            'amount': forms.NumberInput(attrs={'min': '0', 'step': '0.01'}),
            'invoice_number': forms.TextInput(attrs={'placeholder': 'e.g., INV-2024-001'}),
            'description': forms.Textarea(attrs={'rows': 3, 'placeholder': 'Enter invoice description...'}),
        }
        help_texts = {
            'invoice_number': 'Enter a unique invoice number',
            'amount': 'Enter the total amount for this invoice',
            'issue_date': 'Date when the invoice is issued',
            'due_date': 'Date when the payment is due',
            'description': 'Optional description of the invoice',
        }

    def clean_invoice_number(self):
        invoice_number = self.cleaned_data.get('invoice_number')
        if Invoice.objects.filter(invoice_number=invoice_number).exists():
            raise forms.ValidationError('This invoice number already exists. Please choose a different one.')
        return invoice_number

class PaymentForm(forms.ModelForm):
    class Meta:
        model = Payment
        fields = ['amount', 'payment_date', 'payment_method', 'transaction_id', 'notes']
        widgets = {
            'payment_date': forms.DateInput(attrs={'type': 'date'}),
            'amount': forms.NumberInput(attrs={'min': '0', 'step': '0.01'}),
        }

class ExpenseForm(forms.ModelForm):
    class Meta:
        model = Expense
        fields = ['amount', 'date', 'category', 'description', 'receipt']
        widgets = {
            'date': forms.DateInput(attrs={'type': 'date', 'class': 'form-control'}),
            'amount': forms.NumberInput(attrs={'min': '0', 'step': '0.01', 'class': 'form-control'}),
            'category': forms.Select(attrs={'class': 'form-control'}),
            'description': forms.Textarea(attrs={'class': 'form-control', 'rows': 3}),
            'receipt': forms.FileInput(attrs={'class': 'form-control'}),
        }
        labels = {
            'amount': 'Amount ($)',
            'date': 'Expense Date',
            'category': 'Expense Category',
            'description': 'Description',
            'receipt': 'Upload Receipt (Optional)',
        }

class FinancialReportForm(forms.ModelForm):
    class Meta:
        model = FinancialReport
        fields = ['report_type', 'start_date', 'end_date', 'total_income', 'total_expenses', 'net_profit', 'notes']
        widgets = {
            'start_date': forms.DateInput(attrs={'type': 'date'}),
            'end_date': forms.DateInput(attrs={'type': 'date'}),
            'total_income': forms.NumberInput(attrs={'min': '0', 'step': '0.01'}),
            'total_expenses': forms.NumberInput(attrs={'min': '0', 'step': '0.01'}),
            'net_profit': forms.NumberInput(attrs={'min': '0', 'step': '0.01'}),
        } 