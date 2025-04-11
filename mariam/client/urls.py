from django.contrib import admin
from django.urls import path, include
from . import views

urlpatterns = [
    path('index1',views.index1),
    path('dashboard/', views.dashboard_view, name='dashboard'),
    path('admin_dashboard/', views.admin_dashboard, name='admin_dashboard'),
    path('enquiry/<int:pk>/update/', views.update_enquiry, name='update_enquiry'),
    path('enquiry/<int:pk>/convert/', views.convert_to_project, name='convert_to_project'),
    
    # Staff Management
    path('add_staff/', views.add_staff, name='add_staff'),
    path('manage_staff/', views.manage_staff, name='manage_staff'),
    path('staff/<int:pk>/edit/', views.edit_staff, name='edit_staff'),
    path('staff/<int:pk>/activate/', views.activate_staff, name='activate_staff'),
    path('staff/<int:pk>/deactivate/', views.deactivate_staff, name='deactivate_staff'),
    
    # Project Management
    path('projects/', views.project_list, name='project_list'),
    path('projects/<int:pk>/', views.project_detail, name='project_detail'),
    path('projects/<int:pk>/update/', views.update_project, name='update_project'),
    
    # Staff Dashboard
    path('staff/dashboard/', views.staff_dashboard, name='staff_dashboard'),
    path('staff/projects/', views.staff_projects, name='staff_projects'),
    path('staff/projects/<int:pk>/', views.staff_project_detail, name='staff_project_detail'),
]

