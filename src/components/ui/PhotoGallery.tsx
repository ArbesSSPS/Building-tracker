'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronLeft, ChevronRight, Image as ImageIcon } from 'lucide-react'

interface PhotoGalleryProps {
  photos: string[]
  title?: string
  className?: string
}

export default function PhotoGallery({ photos, title, className = '' }: PhotoGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)

  if (!photos || photos.length === 0) {
    return (
      <div className={`flex items-center justify-center p-8 text-gray-500 ${className}`}>
        <div className="text-center">
          <ImageIcon className="w-12 h-12 mx-auto mb-2 text-gray-300" />
          <p className="text-sm">Žádné fotografie</p>
        </div>
      </div>
    )
  }

  const openModal = (index: number) => {
    setSelectedIndex(index)
  }

  const closeModal = () => {
    setSelectedIndex(null)
  }

  const nextPhoto = () => {
    if (selectedIndex !== null) {
      setSelectedIndex((selectedIndex + 1) % photos.length)
    }
  }

  const prevPhoto = () => {
    if (selectedIndex !== null) {
      setSelectedIndex(selectedIndex === 0 ? photos.length - 1 : selectedIndex - 1)
    }
  }

  return (
    <>
      <div className={className}>
        {title && (
          <h4 className="text-sm font-medium text-gray-700 mb-3">{title}</h4>
        )}
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {photos.map((photo, index) => (
            <motion.div
              key={index}
              className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden cursor-pointer group"
              onClick={() => openModal(index)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <img
                src={photo}
                alt={`Fotografie ${index + 1}`}
                className="w-full h-full object-cover group-hover:blur-sm transition-all duration-200"
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  target.src = '/placeholder-image.png'
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <ImageIcon className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 drop-shadow-lg" />
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {selectedIndex !== null && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeModal}
          >
            <div className="relative max-w-4xl max-h-[90vh] w-full mx-4">
              {/* Close button */}
              <button
                onClick={closeModal}
                className="absolute top-4 right-4 z-10 p-2 bg-black bg-opacity-50 rounded-full text-white hover:bg-opacity-70 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>

              {/* Navigation buttons */}
              {photos.length > 1 && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      prevPhoto()
                    }}
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10 p-2 bg-black bg-opacity-50 rounded-full text-white hover:bg-opacity-70 transition-colors"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      nextPhoto()
                    }}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 z-10 p-2 bg-black bg-opacity-50 rounded-full text-white hover:bg-opacity-70 transition-colors"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </>
              )}

              {/* Image */}
              <motion.div
                className="relative"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={(e) => e.stopPropagation()}
              >
                <img
                  src={photos[selectedIndex]}
                  alt={`Fotografie ${selectedIndex + 1}`}
                  className="max-w-full max-h-[90vh] object-contain rounded-lg"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    target.src = '/placeholder-image.png'
                  }}
                />
              </motion.div>

              {/* Photo counter */}
              {photos.length > 1 && (
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm">
                  {selectedIndex + 1} / {photos.length}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
