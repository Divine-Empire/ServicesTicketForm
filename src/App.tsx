import { useState, useEffect } from "react";
import { Check, AlertCircle, Loader2 } from "lucide-react";

const TicketEnquiry = () => {
  const [tickets, setTickets] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [categories, setCategories] = useState([]);
  const [errors, setErrors] = useState({});

  const [formData, setFormData] = useState({
    clientName: "",
    phoneNumber: "",
    emailAddress: "",
    category: "",
    priority: "",
    title: "",
    description: "",
  });

  const sheet_url =
    "https://script.google.com/macros/s/AKfycbzsDuvTz21Qx8fAP3MthQdRanIKnFFScPf-SRYp40CqYfKmO4CImMH7-_cVQjMqCsBD/exec";

  const fetchMasterSheet = async () => {
    try {
      const response = await fetch(`${sheet_url}?sheet=Master`);
      const result = await response.json();

      if (result.success && result.data && result.data.length > 0) {
        const columnAData = result.data
          .slice(1)
          .map((row) => row[0])
          .filter((item) => item && item.trim() !== "")
          .filter((item, index, self) => self.indexOf(item) === index);

        setCategories(columnAData);
      }
    } catch (error) {
      console.error("Error fetching master data:", error);
    }
  };

  useEffect(() => {
    fetchMasterSheet();
  }, []);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.clientName.trim()) newErrors.clientName = 'Client name is required';
    if (!formData.phoneNumber.trim()) newErrors.phoneNumber = 'Phone number is required';
    if (!formData.emailAddress.trim()) {
      newErrors.emailAddress = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.emailAddress)) {
      newErrors.emailAddress = 'Please enter a valid email address';
    }
    if (!formData.category) newErrors.category = 'Category is required';
    if (!formData.priority) newErrors.priority = 'Priority is required';
    if (!formData.title.trim()) newErrors.title = 'Title is required';
    if (!formData.description.trim()) newErrors.description = 'Description is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const headersResponse = await fetch(`${sheet_url}?sheet=Ticket_Enquiry`);
      const headersData = await headersResponse.json();

      if (!headersData.success || !headersData.data) {
        throw new Error("Could not fetch headers");
      }

      const headerRowIndex = headersData.data.findIndex(
        (row) => row[0] === "Timestamp"
      );

      if (headerRowIndex === -1) {
        throw new Error("Could not find header row in data");
      }

      const headers = headersData.data[headerRowIndex];
      
      // Generate next ticket ID by finding the highest existing ticket number
      let nextTicketNumber = 1;
      const ticketIdColumnIndex = headers.findIndex(header => header === "Ticket ID");
      
      if (ticketIdColumnIndex !== -1) {
        const existingTicketIds = headersData.data
          .slice(headerRowIndex + 1) // Skip header row
          .map(row => row[ticketIdColumnIndex])
          .filter(id => id && typeof id === 'string' && id.startsWith('TN-'))
          .map(id => {
            const numPart = id.replace('TN-', '');
            return parseInt(numPart, 10);
          })
          .filter(num => !isNaN(num));

        if (existingTicketIds.length > 0) {
          nextTicketNumber = Math.max(...existingTicketIds) + 1;
        }
      }

      const ticketId = `TN-${String(nextTicketNumber).padStart(3, "0")}`;

      const newTicket = {
        Timestamp: formatDateTime(new Date()),
        "Ticket ID": ticketId,
        "Client Name": formData.clientName,
        "Phone Number": formData.phoneNumber,
        "Email Address": formData.emailAddress,
        Category: formData.category,
        Priority: formData.priority,
        Title: formData.title,
        Description: formData.description,
        ColumnAData: formatDateTime(new Date()),
      };

      const rowData = headers.map((header) => {
        return newTicket[header] || "";
      });

      const response = await fetch(sheet_url, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          sheetName: "Ticket_Enquiry",
          action: "insert",
          rowData: JSON.stringify(rowData),
        }),
      });

      const result = await response.json();

      if (result.success) {
        setFormData({
          clientName: "",
          phoneNumber: "",
          emailAddress: "",
          category: "",
          priority: "",
          title: "",
          description: "",
        });

        setShowSuccessPopup(true);
        
        // Auto-close popup after 3 seconds
        setTimeout(() => {
          setShowSuccessPopup(false);
        }, 3000);
      } else {
        throw new Error(result.error || "Failed to save ticket");
      }
    } catch (error) {
      console.error("Error submitting ticket:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDateTime = (date) => {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    const seconds = String(d.getSeconds()).padStart(2, "0");

    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'text-red-700 bg-red-50 border-red-200';
      case 'medium': return 'text-yellow-700 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-green-700 bg-green-50 border-green-200';
      default: return 'text-gray-700 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Main Content Container */}
      <div className="py-4 px-4 sm:py-8 pb-24">
        <div className="max-w-4xl mx-auto">
          {/* Main Form Card */}
          <div className="bg-white rounded-xl shadow-2xl border border-blue-200 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 sm:p-6">
              <div className="text-center">
                <h2 className="text-xl sm:text-2xl font-semibold text-white">Support Ticket Form</h2>
              </div>
            </div>

            {/* Form Content */}
            <div className="p-4 sm:p-6 lg:p-8">
              <div className="space-y-6">
                {/* Personal Information Section */}
                <div>
                  <h3 className="text-lg font-semibold text-blue-800 mb-4 flex items-center">
                    <div className="w-2 h-2 bg-blue-600 rounded-full mr-3"></div>
                    Personal Information
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    <div className="space-y-2">
                      <label htmlFor="clientName" className="block text-sm font-medium text-blue-800">
                        Client Name *
                      </label>
                      <input
                        id="clientName"
                        type="text"
                        value={formData.clientName}
                        onChange={(e) => handleInputChange("clientName", e.target.value)}
                        disabled={isSubmitting}
                        className={`w-full px-3 py-2 sm:py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                          errors.clientName ? 'border-red-300 bg-red-50' : 'border-blue-200'
                        }`}
                        placeholder="Enter your full name"
                      />
                      {errors.clientName && (
                        <p className="text-red-600 text-sm flex items-center">
                          <AlertCircle className="w-4 h-4 mr-1" />
                          {errors.clientName}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="phoneNumber" className="block text-sm font-medium text-blue-800">
                        Phone Number *
                      </label>
                      <input
                        id="phoneNumber"
                        type="tel"
                        value={formData.phoneNumber}
                        onChange={(e) => handleInputChange("phoneNumber", e.target.value)}
                        disabled={isSubmitting}
                        className={`w-full px-3 py-2 sm:py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                          errors.phoneNumber ? 'border-red-300 bg-red-50' : 'border-blue-200'
                        }`}
                        placeholder="Enter your phone number"
                      />
                      {errors.phoneNumber && (
                        <p className="text-red-600 text-sm flex items-center">
                          <AlertCircle className="w-4 h-4 mr-1" />
                          {errors.phoneNumber}
                        </p>
                      )}
                    </div>

                    <div className="sm:col-span-2 space-y-2">
                      <label htmlFor="emailAddress" className="block text-sm font-medium text-blue-800">
                        Email Address *
                      </label>
                      <input
                        id="emailAddress"
                        type="email"
                        value={formData.emailAddress}
                        onChange={(e) => handleInputChange("emailAddress", e.target.value)}
                        disabled={isSubmitting}
                        className={`w-full px-3 py-2 sm:py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                          errors.emailAddress ? 'border-red-300 bg-red-50' : 'border-blue-200'
                        }`}
                        placeholder="Enter your email address"
                      />
                      {errors.emailAddress && (
                        <p className="text-red-600 text-sm flex items-center">
                          <AlertCircle className="w-4 h-4 mr-1" />
                          {errors.emailAddress}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Ticket Details Section */}
                <div>
                  <h3 className="text-lg font-semibold text-blue-800 mb-4 flex items-center">
                    <div className="w-2 h-2 bg-blue-600 rounded-full mr-3"></div>
                    Ticket Details
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    <div className="space-y-2">
                      <label htmlFor="category" className="block text-sm font-medium text-blue-800">
                        Category *
                      </label>
                      <select
                        id="category"
                        value={formData.category}
                        onChange={(e) => handleInputChange("category", e.target.value)}
                        disabled={isSubmitting}
                        className={`w-full px-3 py-2 sm:py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                          errors.category ? 'border-red-300 bg-red-50' : 'border-blue-200'
                        }`}
                      >
                        <option value="">Select category</option>
                        {categories.length > 0 ? (
                          categories.map((category, index) => (
                            <option key={index} value={category}>
                              {category}
                            </option>
                          ))
                        ) : (
                          <option value="" disabled>Loading categories...</option>
                        )}
                      </select>
                      {errors.category && (
                        <p className="text-red-600 text-sm flex items-center">
                          <AlertCircle className="w-4 h-4 mr-1" />
                          {errors.category}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="priority" className="block text-sm font-medium text-blue-800">
                        Priority *
                      </label>
                      <select
                        id="priority"
                        value={formData.priority}
                        onChange={(e) => handleInputChange("priority", e.target.value)}
                        disabled={isSubmitting}
                        className={`w-full px-3 py-2 sm:py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                          errors.priority ? 'border-red-300 bg-red-50' : getPriorityColor(formData.priority)
                        }`}
                      >
                        <option value="">Select priority</option>
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                      </select>
                      {errors.priority && (
                        <p className="text-red-600 text-sm flex items-center">
                          <AlertCircle className="w-4 h-4 mr-1" />
                          {errors.priority}
                        </p>
                      )}
                    </div>

                    <div className="sm:col-span-2 space-y-2">
                      <label htmlFor="title" className="block text-sm font-medium text-blue-800">
                        Title *
                      </label>
                      <input
                        id="title"
                        type="text"
                        value={formData.title}
                        onChange={(e) => handleInputChange("title", e.target.value)}
                        disabled={isSubmitting}
                        className={`w-full px-3 py-2 sm:py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                          errors.title ? 'border-red-300 bg-red-50' : 'border-blue-200'
                        }`}
                        placeholder="Enter a brief title for your ticket"
                      />
                      {errors.title && (
                        <p className="text-red-600 text-sm flex items-center">
                          <AlertCircle className="w-4 h-4 mr-1" />
                          {errors.title}
                        </p>
                      )}
                    </div>

                    <div className="sm:col-span-2 space-y-2">
                      <label htmlFor="description" className="block text-sm font-medium text-blue-800">
                        Description *
                      </label>
                      <textarea
                        id="description"
                        rows={4}
                        value={formData.description}
                        onChange={(e) => handleInputChange("description", e.target.value)}
                        disabled={isSubmitting}
                        className={`w-full px-3 py-2 sm:py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-none ${
                          errors.description ? 'border-red-300 bg-red-50' : 'border-blue-200'
                        }`}
                        placeholder="Please provide detailed information about your request..."
                      />
                      {errors.description && (
                        <p className="text-red-600 text-sm flex items-center">
                          <AlertCircle className="w-4 h-4 mr-1" />
                          {errors.description}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Centered Submit Button */}
                <div className="pt-6 border-t border-gray-200">
                  <div className="flex justify-center">
                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={isSubmitting}
                      className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-400 text-white font-medium py-3 px-12 rounded-lg shadow-md transition-all duration-200 transform hover:scale-105 active:scale-95 disabled:scale-100 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? (
                        <div className="flex items-center justify-center">
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Processing...
                        </div>
                      ) : (
                        'Submit Ticket'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Fixed Footer at Bottom */}
      <footer className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-blue-600 to-indigo-600 py-3 px-4 shadow-lg z-40">
        <div className="max-w-4xl mx-auto">
          <div className="text-center">
            <p className="text-sm text-white">
              Powered by{' '}
              <a
                href="https://www.botivate.in"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-200 hover:text-white font-medium transition-colors duration-200 hover:underline"
              >
                botivate
              </a>
            </p>
          </div>
        </div>
      </footer>

      {/* Success Popup */}
      {showSuccessPopup && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-auto transform animate-pulse">
            <div className="p-6 text-center">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
                <Check className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Ticket Submitted Successfully!
              </h3>
              <p className="text-gray-600 mb-6">
                Your support ticket has been created and our team will get back to you soon.
              </p>
              <button
                onClick={() => setShowSuccessPopup(false)}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium py-3 px-6 rounded-lg shadow-md transition-all duration-200 transform hover:scale-105 active:scale-95"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TicketEnquiry;