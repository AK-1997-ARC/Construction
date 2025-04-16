from django.contrib import admin
from .models import User, ServiceCategory, Service, Project, Message, Meeting, BudgetDiscussion

@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ('username', 'email', 'user_type', 'is_active')
    list_filter = ('user_type', 'is_active')
    search_fields = ('username', 'email', 'first_name', 'last_name')

@admin.register(ServiceCategory)
class ServiceCategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'created_at')
    search_fields = ('name',)

@admin.register(Service)
class ServiceAdmin(admin.ModelAdmin):
    list_display = ('name', 'category', 'price')
    list_filter = ('category',)
    search_fields = ('name', 'description')

@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ('service', 'client', 'staff', 'status', 'budget', 'start_date')
    list_filter = ('status', 'service__category')
    search_fields = ('service__name', 'client__username', 'staff__username')
    raw_id_fields = ('client', 'staff')
    date_hierarchy = 'start_date'
    
    def get_form(self, request, obj=None, **kwargs):
        form = super().get_form(request, obj, **kwargs)
        if 'staff' in form.base_fields:
            form.base_fields['staff'].queryset = User.objects.filter(user_type='staff', is_active=True)
        return form

@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ('project', 'sender', 'created_at', 'is_read')
    list_filter = ('is_read', 'created_at')
    search_fields = ('content', 'project__service__name')

@admin.register(Meeting)
class MeetingAdmin(admin.ModelAdmin):
    list_display = ('project', 'staff', 'client', 'date_time', 'location')
    list_filter = ('date_time',)
    search_fields = ('project__service__name', 'location', 'agenda')

@admin.register(BudgetDiscussion)
class BudgetDiscussionAdmin(admin.ModelAdmin):
    list_display = ('project', 'sender', 'created_at', 'is_admin_reply')
    list_filter = ('is_admin_reply', 'created_at')
    search_fields = ('message', 'project__service__name')
