import fitz
import numpy as np
import cv2
import base64
import sys
from typing import Optional
from dataclasses import dataclass
from time import time

@dataclass
class PDFPageImage:
    data: bytes
    width: int
    height: int
    applied_rotation: float
    elapsed_time: float

def bytes_to_cv2(image_bytes: bytes) -> np.ndarray:
    """Convert bytes to OpenCV image format."""
    nparr = np.frombuffer(image_bytes, np.uint8)
    return cv2.imdecode(nparr, cv2.IMREAD_COLOR)

def cv2_to_bytes(image: np.ndarray) -> bytes:
    """Convert OpenCV image to bytes."""
    _, buffer = cv2.imencode('.jpg', image)
    return buffer.tobytes()

def extract_image_page_bytes(page: fitz.Page, zoom: float = 2.0) -> bytes:
    """Extract image from PDF page."""
    return page.get_pixmap(matrix=fitz.Matrix(zoom, zoom)).pil_tobytes(format="JPEG", optimize=True)

def preprocess_pdf_page_image(
    source_image: np.ndarray,
    pre_defined_rotation: Optional[float] = None,
    is_structured: bool = True,
) -> PDFPageImage:
    """Preprocess the image for optimal processing."""
    start_time = time()
    source_image = np.copy(source_image)
    img_height, img_width, *_ = source_image.shape

    # For now, we'll keep it simple and just return the image as is
    # We can add more preprocessing steps later if needed
    page = source_image
    page_rotation = 0
    data = cv2_to_bytes(page)
    page_height, page_width, *_ = page.shape

    return PDFPageImage(
        data=data,
        width=page_width,
        height=page_height,
        applied_rotation=page_rotation,
        elapsed_time=time() - start_time,
    )

def get_image_from_pdf(pdf_bytes: bytes) -> Optional[list[str]]:
    """Convert PDF to list of base64 encoded images, one per page."""
    try:
        images = []
        with fitz.Document(stream=pdf_bytes, filetype="pdf") as doc:
            # Process each page
            for page_num in range(len(doc)):
                try:
                    page = doc[page_num]
                    # Extract image with higher zoom for better quality
                    image_bytes = extract_image_page_bytes(page, zoom=3.0)
                    
                    # Convert to OpenCV format
                    cv_image = bytes_to_cv2(image_bytes)
                    if cv_image is None:
                        print(f"Failed to decode image for page {page_num + 1}", file=sys.stderr)
                        continue
                        
                    # Preprocess
                    processed_image = preprocess_pdf_page_image(cv_image)
                    
                    # Verify the processed image data
                    if not processed_image.data:
                        print(f"Empty image data for page {page_num + 1}", file=sys.stderr)
                        continue
                        
                    # Convert to base64 and add to list
                    base64_str = base64.b64encode(processed_image.data).decode("utf-8")
                    if base64_str:
                        images.append(base64_str)
                    else:
                        print(f"Failed to encode page {page_num + 1} to base64", file=sys.stderr)
                        
                except Exception as page_error:
                    print(f"Error processing page {page_num + 1}: {str(page_error)}", file=sys.stderr)
                    continue  # Skip this page and continue with others
                    
        if not images:
            print("No valid images were extracted from the PDF", file=sys.stderr)
            return None
            
        print(f"Successfully processed {len(images)} pages from PDF", file=sys.stderr)
        return images
        
    except Exception as e:
        print(f"Error processing PDF: {str(e)}", file=sys.stderr)
        return None 