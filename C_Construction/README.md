# Construction Company Website

A Django-based web application for managing construction projects, services, and communication between clients, staff, and administrators.

## Features

- Three user types: Admin, Staff, and Client
- Service and category management
- Project tracking and management
- Real-time chat system with file sharing
- Meeting scheduling
- Email notifications
- Responsive design

## Prerequisites

- Python 3.8 or higher
- pip (Python package manager)

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd construction_company
```

2. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Configure environment variables:
Create a `.env` file in the project root with the following variables:
```
SECRET_KEY=your-secret-key
DEBUG=True
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
```

5. Run migrations:
```bash
python manage.py makemigrations
python manage.py migrate
```

6. Create a superuser (admin):
```bash
python manage.py createsuperuser
```

## Running the Application

1. Start the development server:
```bash
python manage.py runserver
```

2. Access the application at `http://127.0.0.1:8000/`

## Usage

### Admin
- Add service categories and services
- Manage projects and staff assignments
- Communicate with clients and staff
- View all projects and inquiries

### Staff
- View assigned projects
- Update project status
- Schedule meetings with clients
- Communicate with clients and admin

### Client
- View services and make inquiries
- Track project progress
- Communicate with staff and admin
- Schedule and attend meetings

## Project Structure

```
construction_company/
├── core/
│   ├── migrations/
│   ├── templates/
│   ├── __init__.py
│   ├── admin.py
│   ├── apps.py
│   ├── forms.py
│   ├── models.py
│   ├── urls.py
│   └── views.py
├── construction_company/
│   ├── __init__.py
│   ├── asgi.py
│   ├── settings.py
│   ├── urls.py
│   └── wsgi.py
├── media/
├── static/
├── templates/
├── .env
├── manage.py
└── requirements.txt
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 