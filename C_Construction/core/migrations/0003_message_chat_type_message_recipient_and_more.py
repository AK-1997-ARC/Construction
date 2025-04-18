# Generated by Django 4.2.7 on 2025-04-16 05:59

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0002_alter_message_options_remove_message_receiver_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='message',
            name='chat_type',
            field=models.CharField(choices=[('project', 'Project Chat'), ('private', 'Private Chat')], default='project', max_length=10),
        ),
        migrations.AddField(
            model_name='message',
            name='recipient',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='received_messages', to=settings.AUTH_USER_MODEL),
        ),
        migrations.AlterField(
            model_name='message',
            name='project',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='messages', to='core.project'),
        ),
    ]
