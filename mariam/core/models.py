from django.db import models
from django.contrib.auth.models import AbstractUser
from django.contrib.auth.hashers import make_password

class User(AbstractUser):
    ROLE_CHOICES = [
        ('Architect', 'Architect'),
        ('Civil Engineer', 'Civil Engineer'),
        ('Project Manager', 'Project Manager'),
        ('Site Supervisor', 'Site Supervisor'),
        ('Draftsman', 'Draftsman'),
        ('Quantity Surveyor', 'Quantity Surveyor'),
        ('Construction Worker', 'Construction Worker'),
    ]

    DEPARTMENT_CHOICES = [
        ('Architecture', 'Architecture'),
        ('Engineering', 'Engineering'),
        ('Construction', 'Construction'),
        ('Management', 'Management'),
        ('Finance', 'Finance'),
        ('Procurement', 'Procurement'),
    ]

    profile_pic = models.ImageField(upload_to='staff_profiles/', blank=True, null=True, verbose_name="Profile Picture")
    phone = models.CharField(max_length=15, blank=True, null=True, verbose_name="Phone Number")
    role = models.CharField(max_length=50, choices=ROLE_CHOICES, verbose_name="Job Title",null=True)
    department = models.CharField(max_length=50, choices=DEPARTMENT_CHOICES, verbose_name="Department",null=True)
    experience = models.PositiveIntegerField(verbose_name="Years of Experience",null=True)
    usertype = models.CharField(max_length=100,null=True,default="admin")

    


class ServiceCategory(models.Model):
    name = models.CharField(max_length=255)
    image = models.ImageField(upload_to='service_categories/', null=True, blank=True)

    def __str__(self):
        return self.name


class Service(models.Model):
    name = models.CharField(max_length=255)
    category = models.ForeignKey(ServiceCategory, related_name='services', on_delete=models.CASCADE)
    image = models.ImageField(upload_to='services/', null=True, blank=True)
    description = models.TextField()

    def __str__(self):
        return self.name

class Enquiry(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('accepted', 'Accepted'),
        ('rejected', 'Rejected'),
        ('holding', 'Holding'),
    ]


    user = models.ForeignKey(User, on_delete=models.CASCADE,null=True)
    name = models.CharField(max_length=100,null=True)
    email = models.EmailField(null=True)
    phone = models.CharField(max_length=12,null=True)
    service = models.ForeignKey(Service, on_delete=models.CASCADE,null=True)
    budget_range = models.CharField(max_length=50,null=True)
    desired_start_date = models.DateField(null=True)
    desired_style = models.CharField(max_length=100,null=True)
    estimated_square_footage = models.CharField(max_length=100,null=True)
    message = models.TextField(null=True)
    status = models.TextField(null=True)

    def __str__(self):
        return f"Enquiry from {self.name} regarding {self.service.name}"

    def __str__(self):
        return f"Enquiry from {self.name}"



class Project(models.Model):
    STATUS_CHOICES = [
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('on_hold', 'On Hold'),
    ]
    
    title = models.CharField(max_length=200)
    description = models.TextField()
    start_date = models.DateField()
    expected_end_date = models.DateField()
    actual_end_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='in_progress')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='projects', null=True)
    assigned_staff = models.ManyToManyField(User, related_name='assigned_projects')
    enquiry = models.ForeignKey(Enquiry, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title
