from django.contrib import admin
from django.urls import path, include
from . import views

urlpatterns = [
    path('',views.index),
    path('register/', views.register, name="register"),
    path('login/', views.login_view, name="login"),
    path('logout/', views.logout_view, name="logout_page"),


    path('admin_dashboard_page', views.admin_dashboard_view, name="admin_dashboard_page"),
    path('service_category_list/', views.service_category_list, name='service_category_list'),
    path('category/<int:category_id>/services/', views.service_list, name='service_list'),
    path('category/add/', views.add_service_category, name='add_service_category'),
    path('category/<int:category_id>/edit/', views.edit_service_category, name='edit_service_category'),
    path('category/<int:category_id>/delete/', views.delete_service_category, name='delete_service_category'),
    path('category/<int:category_id>/add_service/', views.add_service, name='add_service'),
    path('service/<int:service_id>/edit/', views.edit_service, name='edit_service'),
    path('service/<int:service_id>/delete/', views.delete_service, name='delete_service'),
    
    path('admin-client', views.admin_client_view,name='admin-client'),
    path('admin-content', views.admin_content_view,name='admin-content'),
    path('admin-service-content', views.admin_service_content_view,name='admin-service-content'),
    path('admin-project', views.admin_project_view,name='admin-project'),
    path('admin-staff', views.admin_staff_view,name='admin-staff'),
    path('admin-analytics', views.admin_analytics_view,name='admin-analytics'),
    path('admin-communication', views.admin_communication_view,name='admin-communication'),
    
   
    path('services/', views.service_categories, name='services'),
    path('services_list/<int:category_id>', views.services_list, name='services_list'),


    # path('staff-project', views.staff_project_view,name='staff-project'),
    # path('staff-task', views.staff_task_view,name='staff-task'),
    # path('staff-client', views.staff_client_view,name='staff-client'),
    # path('staff-document', views.staff_document_view,name='staff-document'),
    # path('staff-updates', views.staff_updates_view,name='staff-updates'),
    # path('staff-resources', views.staff_resources_view,name='staff-resources'),
    

    # path('staff/', views.staff_list, name='staff_list'),
    # path('staff/add/', views.staff_create, name='staff_create'),
    # path('staff/edit/<int:staff_id>/', views.staff_update, name='staff_update'),
    # path('staff/delete/<int:staff_id>/', views.staff_delete, name='staff_delete'),

    # path('enquiries/', views.enquiry_list, name='enquiry_list'),
    # path('reply/<int:enquiry_id>/', views.reply_email, name='reply_email'),
    # path('enquiries/<int:enquiry_id>/', views.update_status, name='update_status'),

    # path('projects/', views.project_list, name='project_list'),
    # path('projects/<int:pk>/', views.project_detail, name='project_detail'),
    # path('projects/<int:pk>/update/', views.update_project, name='update_project'),
    
]

    