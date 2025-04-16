from django.urls import path
from . import views

urlpatterns = [
    path('', views.home, name='home'),
    path('register/', views.register, name='register'),
    path('login/', views.login_view, name='login'),
    path('logout/', views.logout_view, name='logout'),
    path('dashboard/', views.dashboard, name='dashboard'),
    path('profile/', views.profile, name='profile'),
    path('project/<int:project_id>/', views.project_detail, name='project_detail'),
    path('project/<int:project_id>/chat/', views.project_chat, name='project_chat'),
    path('project/<int:project_id>/budget/', views.budget_discussion, name='budget_discussion'),
    path('private-chat/', views.private_chat, name='private_chat'),
    path('private-chat/<int:recipient_id>/', views.private_chat, name='private_chat'),
    path('services/', views.service_list, name='service_list'),
    path('services/<int:service_id>/', views.service_detail, name='service_detail'),
    path('services/<int:service_id>/inquiry/', views.project_inquiry, name='project_inquiry'),
    path('project/<int:project_id>/accept/', views.accept_inquiry, name='accept_inquiry'),
    path('project/<int:project_id>/assign/', views.assign_staff, name='assign_staff'),
    path('project/<int:project_id>/update-status/', views.update_project_status, name='update_project_status'),
    path('project/<int:project_id>/schedule-meeting/', views.schedule_meeting, name='schedule_meeting'),
    path('add-staff/', views.add_staff, name='add_staff'),
    path('add-service-category/', views.add_service_category, name='add_service_category'),
    path('add-service/', views.add_service, name='add_service'),
    path('project/<int:project_id>/invoices/', views.project_invoices, name='project_invoices'),
    path('project/<int:project_id>/invoices/create/', views.create_invoice, name='create_invoice'),
    path('invoice/<int:invoice_id>/', views.invoice_detail, name='invoice_detail'),
    path('invoice/<int:invoice_id>/pay/', views.process_payment, name='process_payment'),
    path('invoice/<int:invoice_id>/payments/', views.invoice_payments, name='invoice_payments'),
    path('project/<int:project_id>/expenses/', views.project_expenses, name='project_expenses'),
    path('project/<int:project_id>/expenses/create/', views.create_expense, name='create_expense'),
    path('expense/<int:expense_id>/', views.expense_detail, name='expense_detail'),
    path('project/<int:project_id>/reports/', views.project_reports, name='project_reports'),
    path('project/<int:project_id>/reports/create/', views.create_report, name='create_report'),
    path('report/<int:report_id>/', views.report_detail, name='report_detail'),
    path('invoices/', views.project_invoices, name='all_invoices'),
    path('invoice/<int:invoice_id>/edit/', views.edit_invoice, name='edit_invoice'),
    path('meeting/<int:meeting_id>/reschedule/', views.reschedule_meeting, name='reschedule_meeting'),
] 