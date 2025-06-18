"""
URL configuration for invoice_backend project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import HttpResponse, JsonResponse
from rest_framework.routers import DefaultRouter
from invoices.views import CompanyViewSet, VendorViewSet, ItemViewSet, InvoiceViewSet, InvoiceLineItemViewSet, AssignmentRuleViewSet
from purchase_orders.views import PurchaseOrderViewSet, PurchaseOrderLineItemViewSet
from goods_received.views import GoodsReceivedViewSet, GoodsReceivedLineItemViewSet
from invoice_extraction.views import InvoiceExtractionJobViewSet, ExtractedInvoiceViewSet
from django.views.decorators.csrf import csrf_exempt

# Create a router and register our viewsets with it
router = DefaultRouter()
router.register(r'companies', CompanyViewSet)
router.register(r'vendors', VendorViewSet)
router.register(r'items', ItemViewSet)
router.register(r'invoices', InvoiceViewSet)
router.register(r'invoice-line-items', InvoiceLineItemViewSet)
router.register(r'assignment-rules', AssignmentRuleViewSet)
router.register(r'purchase-orders', PurchaseOrderViewSet)
router.register(r'purchase-order-line-items', PurchaseOrderLineItemViewSet)
router.register(r'goods-received', GoodsReceivedViewSet)
router.register(r'goods-received-line-items', GoodsReceivedLineItemViewSet)
router.register(r'extraction-jobs', InvoiceExtractionJobViewSet)
router.register(r'extracted-invoices', ExtractedInvoiceViewSet)

@csrf_exempt
def health_check(request):
    return JsonResponse({"status": "healthy"})

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include(router.urls)),
    path('api/extract-and-match/', InvoiceExtractionJobViewSet.as_view({'post': 'extract_and_match'}), name='extract-and-match'),
    path('api/health/', health_check, name='health_check'),
]

# Serve media files during development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
