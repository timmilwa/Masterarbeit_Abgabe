import { useState } from 'react'
import EmptyState from './components/EmptyState'
import ImageCard from './components/ImageCard'

function App() {
  const [uploadedImage, setUploadedImage] = useState(null)
  const [imageUrl, setImageUrl] = useState(null)

  const handleImageUpload = (event) => {
    const file = event.target.files?.[0]
    if (file && file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file)
      setImageUrl(url)
      setUploadedImage(file)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {!uploadedImage ? (
        <EmptyState onImageUpload={handleImageUpload} />
      ) : (
        <div className="min-h-screen flex items-center justify-center px-4 py-8">
          <div className="flex flex-col lg:flex-row gap-8 items-start">
            {/* Image Section */}
            <div className="flex-shrink-0">
              <div className="relative rounded-lg overflow-hidden">
                <img
                  src={imageUrl}
                  alt="Uploaded"
                  className="h-auto max-h-[80vh] object-contain"
                />
              </div>
            </div>

            {/* Card Section - Top Right */}
            <div className="w-full lg:w-96 flex flex-col gap-4 lg:mt-[50px]">
              <ImageCard />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App

