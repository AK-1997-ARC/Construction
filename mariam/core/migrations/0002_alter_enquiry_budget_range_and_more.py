# Generated by Django 5.1.7 on 2025-04-07 07:01

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='enquiry',
            name='budget_range',
            field=models.CharField(max_length=50, null=True),
        ),
        migrations.AlterField(
            model_name='enquiry',
            name='desired_start_date',
            field=models.DateField(null=True),
        ),
        migrations.AlterField(
            model_name='enquiry',
            name='desired_style',
            field=models.CharField(max_length=100, null=True),
        ),
        migrations.AlterField(
            model_name='enquiry',
            name='email',
            field=models.EmailField(max_length=254, null=True),
        ),
        migrations.AlterField(
            model_name='enquiry',
            name='estimated_square_footage',
            field=models.CharField(max_length=100, null=True),
        ),
        migrations.AlterField(
            model_name='enquiry',
            name='message',
            field=models.TextField(null=True),
        ),
        migrations.AlterField(
            model_name='enquiry',
            name='name',
            field=models.CharField(max_length=100, null=True),
        ),
        migrations.AlterField(
            model_name='enquiry',
            name='phone',
            field=models.CharField(max_length=12, null=True),
        ),
        migrations.AlterField(
            model_name='enquiry',
            name='service',
            field=models.ForeignKey(null=True, on_delete=django.db.models.deletion.CASCADE, to='core.service'),
        ),
    ]
