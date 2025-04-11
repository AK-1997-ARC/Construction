# Generated by Django 5.1.7 on 2025-04-10 06:46

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0003_enquiry_status'),
    ]

    operations = [
        migrations.AddField(
            model_name='enquiry',
            name='user',
            field=models.ForeignKey(null=True, on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL),
        ),
    ]
