from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser

from .models import InvoiceExtractionJob, ExtractedInvoice
from .serializers import (
    InvoiceExtractionJobSerializer,
    ExtractedInvoiceSerializer,
    ExtractAndMatchRequestSerializer,
    ExtractAndMatchResponseSerializer
)
from .services import (
    InvoiceExtractionService,
    ExtractAndMatchOrchestrator
)


class InvoiceExtractionJobViewSet(viewsets.ModelViewSet):
    """ViewSet for InvoiceExtractionJob model."""
    queryset = InvoiceExtractionJob.objects.all()
    serializer_class = InvoiceExtractionJobSerializer
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.extraction_service = InvoiceExtractionService()


    


    @action(detail=False, methods=['post'], parser_classes=[MultiPartParser, FormParser])
    def extract_and_match(self, request):
        """
        Complete extract-and-match workflow: extraction → PO matching → data comparison.
        
        This endpoint provides the full AP processing pipeline:
        1. Extracts invoice data from uploaded file
        2. Matches extracted PO numbers against database using fuzzy matching
        3. Performs comprehensive data comparison between invoice and matched PO
        
        Returns detailed results for each step with AP processor-friendly formatting.
        """
        # Validate request data
        serializer = ExtractAndMatchRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        uploaded_file = serializer.validated_data['file']
        match_threshold = serializer.validated_data['match_threshold']
        
        try:
            # Use orchestrator service to handle the complete workflow
            orchestrator = ExtractAndMatchOrchestrator()
            workflow_result = orchestrator.process_uploaded_file(uploaded_file, match_threshold)
            
            # Serialize and return response
            response_serializer = ExtractAndMatchResponseSerializer(workflow_result)
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response(
                {'error': f'Extract and match workflow failed: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    



class ExtractedInvoiceViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for ExtractedInvoice model (read-only)."""
    queryset = ExtractedInvoice.objects.all()
    serializer_class = ExtractedInvoiceSerializer
