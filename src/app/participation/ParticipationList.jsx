import React, { useEffect, useState } from "react";
import Page from "../dashboard/page";
import ParticipationView from "./ParticipationView";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  ArrowUpDown,
  ChevronDown,
  MoreHorizontal,
  Eye,
  Loader2,
  Delete,
  Edit,
  Trash2,
  RefreshCcwDot,
  Download,
  SquareParking,
  FileText,
  SquareArrowDown,
  SquarePlus,
  MessageCircle,
  Mail,
  MessageCircleCodeIcon,
  Copy,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import BASE_URL from "@/config/BaseUrl";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import CreateEnquiry from "./CreateEnquiry";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import {
  ParticipationCreate,
  ParticipationCrMessage,
  ParticipationEdit,
  ParticipationMessage,
  ParticipationViews,
} from "@/components/base/ButtonComponents";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const Status_Filter = [
  { value: "Pending", label: "Pending" },
  { value: "Confirm", label: "Confirm" },
  { value: "Stall Issued", label: "Stall Issued" },
  { value: "Cancel", label: "Cancel" },
  { value: "All", label: "All" },
  { value: "Enquiry", label: "Enquiry" },
];
const ParticipationList = () => {
  const { toast } = useToast();
  const [selectedEvent, setSelectedEvent] = useState("30");
  const [selectedStatus, setSelectedStatus] = useState(
    localStorage.getItem("selectedStatus") || "All"
  );
  const queryClient = useQueryClient();
  const STATUS_CYCLE = ["Pending", "Confirm", "Stall Issued", "Cancel"];
  const usertype = Number(localStorage.getItem("userType"));
  const isRestrictedUser = usertype === 4;
  const isRestrictedUserDelete = [1, 2, 4].includes(usertype);
  const [downloadProgress, setDownloadProgress] = useState({});
  const [globalWhatsappMessage, setGlobalWhatsappMessage] = useState("");
  const [highlightedRowId, setHighlightedRowId] = useState(null);

  const { data: dateFilter } = useQuery({
    queryKey: ["dateFilter"],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `${BASE_URL}/api/panel-fetch-participantGroup`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      return response.data.event;
    },
  });
  // query to get allpartipants data only
  const { data: allParticipants } = useQuery({
    queryKey: ["allParticipants", selectedEvent],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `${BASE_URL}/api/panel-fetch-participant-list/${selectedEvent}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      return response.data.participant;
    },
  });
  const {
    data: participants,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["participants", selectedEvent, selectedStatus],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `${BASE_URL}/api/panel-fetch-participant-list/${selectedEvent}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (selectedStatus === "All") {
        return response.data.participant;
      }

      return response.data.participant.filter(
        (participant) => participant.profile_status === selectedStatus
      );
    },
  });

  // Add new mutations for invoice creation
  const createPerformaMutation = useMutation({
    mutationFn: async (id) => {
      const token = localStorage.getItem("token");
      const response = await axios.put(
        `${BASE_URL}/api/panel-create-participant-perfoma/${id}`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      return response.data;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Performa created successfully",
        variant: "default",
      });
      queryClient.invalidateQueries(["participants"]);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create Perform",
        variant: "destructive",
      });
    },
  });

  // Function to handle invoice download
  const handleDownloadPerforma = async (id, brandName) => {
    try {
      setDownloadProgress((prev) => ({ ...prev, [id]: 0 }));
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `${BASE_URL}/api/panel-download-participant-perfoma/${id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          responseType: "blob",
          onDownloadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const progress = Math.round(
                (progressEvent.loaded / progressEvent.total) * 100
              );
              setDownloadProgress((prev) => ({ ...prev, [id]: progress })); // Update progress
            }
          },
        }
      );
      const firstWord = brandName ? brandName.split(" ")[0] : "";
      // Create blob link to download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `PI-${firstWord}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      setDownloadProgress((prev) => {
        const updatedProgress = { ...prev };
        delete updatedProgress[id]; // Remove progress after completion
        return updatedProgress;
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download Performa",
        variant: "destructive",
      });
      setDownloadProgress((prev) => {
        const updatedProgress = { ...prev };
        delete updatedProgress[id];
        return updatedProgress;
      });
    }
  };
  useEffect(() => {
    const lastEditedId = localStorage.getItem("lastEditedParticipantId");

    if (lastEditedId) {
      setHighlightedRowId(parseInt(lastEditedId));

      localStorage.removeItem("lastEditedParticipantId");

      setTimeout(() => {
        const element = document.getElementById(
          `participant-row-${lastEditedId}`
        );
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 500);

      setTimeout(() => {
        setHighlightedRowId(null);
      }, 3000);
    }
  }, []);
  const handleWhatsAppPdf = async (registration, brandName, profileStatus) => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `${BASE_URL}/api/panel-download-participant-confirmation/${registration}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          responseType: "blob",
        }
      );

      const pdfBlob = new Blob([response.data], { type: "application/pdf" });

      const file = new File(
        [pdfBlob],
        `confirmation-invoice-${registration}.pdf`,
        {
          type: "application/pdf",
        }
      );

      const message = `Confirmation Invoice for ${
        brandName || ""
      }\n\nParticipant ID: ${registration}\nStatus: ${profileStatus}\n\nPlease find the attached confirmation document.`;

      try {
        if (
          navigator.share &&
          navigator.canShare &&
          navigator.canShare({ files: [file] })
        ) {
          await navigator.share({
            files: [file],
            text: message,
          });
          return;
        }
      } catch (shareError) {
        console.log("Web Share API failed:", shareError);
      }

      if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
        const fileUrl = URL.createObjectURL(file);

        if (navigator.share) {
          try {
            await navigator.share({
              text: message,
              url: fileUrl,
            });
            URL.revokeObjectURL(fileUrl);
            return;
          } catch (mobileShareError) {
            console.log("Mobile share failed:", mobileShareError);
          }
        }

        const whatsappUrl = `whatsapp://send?text=${encodeURIComponent(
          message
        )}`;
        window.location.href = whatsappUrl;

        setTimeout(() => {
          const webWhatsappUrl = `https://web.whatsapp.com/send?text=${encodeURIComponent(
            message
          )}`;
          window.open(webWhatsappUrl, "_blank");
        }, 1000);

        URL.revokeObjectURL(fileUrl);
        return;
      }

      const webWhatsappUrl = `https://web.whatsapp.com/send?text=${encodeURIComponent(
        message
      )}`;
      window.open(webWhatsappUrl, "_blank");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to share confirmation PDF",
        variant: "destructive",
      });
    }
  };

  // Update createInvoiceMutation
  const createInvoiceMutation = useMutation({
    mutationFn: async (id) => {
      const token = localStorage.getItem("token");
      const response = await axios.put(
        `${BASE_URL}/api/panel-create-participant-invoice/${id}`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      return response.data;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Invoice created successfully",
        variant: "default",
      });
      queryClient.invalidateQueries(["participants"]);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create invoice",
        variant: "destructive",
      });
    },
  });
  const createConfirmationMutation = useMutation({
    mutationFn: async (id) => {
      const token = localStorage.getItem("token");
      const response = await axios.put(
        `${BASE_URL}/api/panel-create-participant-confirmation/${id}`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      return response.data;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Confirmation created successfully",
        variant: "default",
      });
      queryClient.invalidateQueries(["participants"]);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create invoice",
        variant: "destructive",
      });
    },
  });
  const handleSendMailConfirmation = useMutation({
    mutationFn: async (id) => {
      const token = localStorage.getItem("token");
      console.log("token", token);
      const response = await axios.get(
        `${BASE_URL}/api/panel-send-participant-confirmation-receipt-email/${id}`,

        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      return response.data;
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: data.msg || "Confirmation Mail Sent successfully",
        variant: "default",
      });
      queryClient.invalidateQueries(["participants"]);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description:
          error.response.data.message || "Failed to sent confirmation mail ",
        variant: "destructive",
      });
    },
  });

  // Function to handle invoice download
  const handleDownloadInvoice = async (id) => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `${BASE_URL}/api/panel-download-participant-invoice/${id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          responseType: "blob",
        }
      );

      // Create blob link to download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `invoice-${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download invoice",
        variant: "destructive",
      });
    }
  };
  const handleDownloadConfirmationInvoice = async (id) => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `${BASE_URL}/api/panel-download-participant-confirmation/${id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          responseType: "blob",
        }
      );

      // Create blob link to download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `confirmation-invoice-${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download confirmation invoice",
        variant: "destructive",
      });
    }
  };

  const getStatusCount = (status) => {
    return (
      allParticipants?.filter(
        (participant) => participant.profile_status === status
      )?.length || 0
    );
  };

  const allCount = allParticipants?.length || 0;
  // const pendingCount =
  //   participants?.filter(
  //     (participant) => participant.profile_status === "Pending"
  //   )?.length || 0;
  // const confirmCount =
  //   participants?.filter(
  //     (participant) => participant.profile_status === "Confirm"
  //   )?.length || 0;
  // const stallCount =
  //   participants?.filter(
  //     (participant) => participant.profile_status === "Stall Issued"
  //   )?.length || 0;
  // const cancelCount =
  //   participants?.filter(
  //     (participant) => participant.profile_status === "Cancel"
  //   )?.length || 0;
  const pendingCount = getStatusCount("Pending");
  const confirmCount = getStatusCount("Confirm");
  const stallCount = getStatusCount("Stall Issued");
  const cancelCount = getStatusCount("Cancel");
  const enquiryCount = getStatusCount("Enquiry");

  const handleDateFilter = (event) => {
    setSelectedEvent(event);
  };

  const handleStatusFilter = (status) => {
    setSelectedStatus(status);
    localStorage.setItem("selectedStatus", status);
  };

  // State for table management
  const [sorting, setSorting] = useState([]);
  const [columnFilters, setColumnFilters] = useState([]);
  const [columnVisibility, setColumnVisibility] = useState({});
  const [rowSelection, setRowSelection] = useState({});
  const [selectedId, setSelectedId] = useState(null);
  const navigate = useNavigate();
  const [isViewExpanded, setIsViewExpanded] = useState(false);
  // Improved Status Update Mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }) => {
      const token = localStorage.getItem("token");
      const response = await axios.put(
        `${BASE_URL}/api/panel-update-participant-status/${id}`,
        { profile_status: status }, // Ensure status is not null
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      return response.data;
    },
    onSuccess: (data, variables) => {
      // Invalidate and refetch queries to update the UI
      queryClient.invalidateQueries({ queryKey: ["allParticipants"] });
      queryClient.invalidateQueries({ queryKey: ["participants"] });
      toast({
        title: "Status Updated",
        description: `Participant status changed to ${variables.status}`,
        variant: "default",
      });
    },
    onError: (error) => {
      console.error("Status Update Error:", error);
      toast({
        title: "Error",
        description: "Failed to update status. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const token = localStorage.getItem("token");
      await axios.delete(`${BASE_URL}/api/panel-delete-participant/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["participants"]);
    },
    onError: (error) => {
      console.error("Error deleting item:", error);
    },
  });
  const handleDelete = (e, id) => {
    e.preventDefault();
    if (window.confirm("Are you sure you want to delete this item?")) {
      deleteMutation.mutate(id);
    }
  };

  // Status Cycle function
  const handleStatusToggle = (id, currentStatus) => {
    const currentIndex = STATUS_CYCLE.indexOf(currentStatus);
    const nextStatus = STATUS_CYCLE[(currentIndex + 1) % STATUS_CYCLE.length];
    updateStatusMutation.mutate({
      id,
      status: nextStatus || "Pending",
    });
  };
  // const handleWhatsAppClick = (e, mobile) => {
  //   e.stopPropagation();
  //   const whatsappUrl = `https://wa.me/+91${mobile.replace(/\D/g, '')}`;
  //   window.open(whatsappUrl, '_blank');
  // };
  const handleWhatsAppClick = (e, mobile) => {
    e.stopPropagation();
    const encodedMessage = encodeURIComponent(globalWhatsappMessage);
    const whatsappUrl = `https://wa.me/+91${mobile.replace(
      /\D/g,
      ""
    )}?text=${encodedMessage}`;
    console.log("WhatsApp URL:", whatsappUrl);
    window.open(whatsappUrl, "_blank");
  };

  // Define columns for the table
  const columns = [
    // {
    //   accessorKey: "id",
    //   header: "ID",
    //   cell: ({ row }) => <div>{row.getValue("id")}</div>,
    // },
    {
      accessorKey: "profile_new_stall_no",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Stall No
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => <div>{row.getValue("profile_new_stall_no")}</div>,
    },
    {
      accessorKey: "name_of_firm",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Firm Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => <div>{row.getValue("name_of_firm")}</div>,
    },
    {
      accessorKey: "brand_name",
      header: "Brand",
      cell: ({ row }) => <div>{row.getValue("brand_name")}</div>,
    },

    {
      accessorKey: "rep1_mobile",
      header: "Mobile",
      cell: ({ row }) => <div>{row.getValue("rep1_mobile")}</div>,
    },
    {
      accessorKey: "profile_status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("profile_status");
        const id = row.original.id

        return (
          <div className="flex items-center space-x-2">
            <span
              className={`px-2 py-1 rounded text-xs ${
                status == "Pending"
                  ? "bg-green-100 text-green-800"
                  : status == "Confirm"
                  ? "bg-blue-100 text-blue-800"
                  : status == "Cancel"
                  ? "bg-red-100 text-red-800"
                  : status == "Enquiry"
                  ? "bg-yellow-100 text-yellow-800"
                  : "bg-gray-100 text-gray-800"
              }`}
            >
              {status}
            </span>
            {!isRestrictedUser && (
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleStatusToggle(id, status);
                }}
                disabled={updateStatusMutation.isPending}
              >
                {updateStatusMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCcwDot className="w-4 h-4" />
                )}
              </Button>
            )}
          </div>
        );
      },
    },
    ...(isRestrictedUser
      ? []
      : [
          {
            id: "actions",

            header: "Action",
            cell: ({ row }) => {
              const registration = row.original.id;
              const distributorState = row.original.distributor_agent_state;
              const status = row.original.profile_status;
              const hasPerformaInvoice = row.original.profile_p_invoice_no;
              const hasInvoice = row.original.profile_invoice_no;
              const hasConfirmation = row.original.profile_c_no;
              const mobile = row.original.rep1_mobile;
              const isDownloading =
                downloadProgress[registration] !== undefined;
              const customerName = row.original.brand_name || "Customer";

              const total = row.original.profile_amount || 0;
              const received = row.original.profile_received_amt || 0;
              const discount = row.original.profile_discount_amt || 0;
              const balance =
                Number(total) - (Number(received) + Number(discount)) || 0;
              return (
                <div className="flex flex-row">
                  {/* <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => handleWhatsAppClick(e, mobile)}
                      title="Open WhatsApp"
                      className="hover:text-green-600"
                    >
                      <MessageCircle className="h-4 w-4" />
                    </Button> */}

                  <ParticipationMessage
                    onClick={(e) => handleWhatsAppClick(e, mobile)}
                    className="hover:text-green-600"
                  />

                  {/* <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        localStorage.setItem("selectedStatus", selectedStatus);
  
                        navigate(`/view-participants/${registration}`);
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button> */}

                  <ParticipationViews
                    onClick={() => {
                      localStorage.setItem("selectedStatus", selectedStatus);
                      localStorage.setItem(
                        "lastEditedParticipantId",
                        registration
                      );
                      navigate(`/view-participants/${registration}`);
                    }}
                  />
                  {/* <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        localStorage.setItem("selectedStatus", selectedStatus);
                        navigate(`/edit-participants/${registration}`);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button> */}
                  <ParticipationEdit
                    onClick={() => {
                      localStorage.setItem("selectedStatus", selectedStatus);
                      localStorage.setItem(
                        "lastEditedParticipantId",
                        registration
                      );
                      navigate(`/edit-participants/${registration}`);
                    }}
                  />
                  {!isRestrictedUserDelete && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(e, registration);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}

                  {status === "Stall Issued" && (
                    <>
                      {!hasPerformaInvoice ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={!distributorState}
                          onClick={(e) => {
                            e.stopPropagation();
                            createPerformaMutation.mutate(registration);
                          }}
                          title={
                            !distributorState
                              ? "Distributor state is required"
                              : "Create Performa"
                          }
                        >
                          {createPerformaMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <SquareParking className="h-4 w-4" />
                          )}
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownloadPerforma(
                              registration,
                              row.original.brand_name
                            );
                          }}
                          disabled={isDownloading}
                          title="Download Performa"
                          className=" hover:text-red-700"
                        >
                          {isDownloading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Download className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </>
                  )}
                  {status === "Stall Issued" && hasPerformaInvoice && (
                    <>
                      {!hasInvoice ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={
                            !distributorState || createInvoiceMutation.isPending
                          }
                          onClick={(e) => {
                            e.stopPropagation();
                            createInvoiceMutation.mutate(registration);
                          }}
                          title={
                            !distributorState
                              ? "Distributor state is required"
                              : "Create Invoice"
                          }
                        >
                          {createInvoiceMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <FileText className="h-4 w-4" />
                          )}
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownloadInvoice(registration);
                          }}
                          title="Download Invoice"
                          className=" hover:text-red-700"
                        >
                          <SquareArrowDown className="h-4 w-4" />
                        </Button>
                      )}
                    </>
                  )}

                  {status === "Stall Issued" && (
                    <>
                      {!hasConfirmation ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={
                            !distributorState ||
                            createConfirmationMutation.isPending
                          }
                          onClick={(e) => {
                            e.stopPropagation();
                            createConfirmationMutation.mutate(registration);
                          }}
                          title={
                            !distributorState
                              ? "Distributor state is required"
                              : "Create Confirmation"
                          }
                        >
                          {createConfirmationMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin " />
                          ) : (
                            <FileText className="h-4 w-4 text-green-800 hover:text-red-700" />
                          )}
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Confirmation Invoice"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownloadConfirmationInvoice(registration);
                          }}
                          className=" text-green-800 hover:text-red-700"
                        >
                          <SquareArrowDown className="h-4 w-4" />
                        </Button>
                      )}
                    </>
                  )}

                  {balance > 0 &&
                    status !== "Cancel" &&
                    status !== "Enquiry" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();

                          const textToCopy = `M/s ${customerName}\nPayment Details of 30th SIGA FAIR \nTotal Amount: ₹${total}\nAdvance Received: ₹${received} \nBalance To: ₹${balance}\nPlease Make Payment as soon as Poosible`;

                          navigator.clipboard
                            .writeText(textToCopy)
                            .then(() => console.log("Copied to clipboard!"))
                            .catch(() => console.log("Failed to copy"));
                        }}
                        title="Copy"
                        className=" hover:text-red-700"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    )}
                </div>
              );
            },
          },
        ]),
  ];

  // Create the table instance
  const table = useReactTable({
    data: participants || [],
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
    initialState: {
      pagination: {
        pageSize: 300,
      },
    },
  });
  // Handle row click
  const handleRowClick = (id) => {
    setSelectedId(id);
    setIsViewExpanded(true);
  };

  // Render loading state
  if (isLoading) {
    return (
      <Page>
        <div className="flex justify-center items-center h-full">
          <Button disabled>
            <Loader2 className=" h-4 w-4 animate-spin" />
            Loading Participants
          </Button>
        </div>
      </Page>
    );
  }

  // Render error state
  if (isError) {
    return (
      <Page>
        <Card className="w-full max-w-md mx-auto mt-10 ">
          <CardHeader>
            <CardTitle className="text-destructive">
              Error Fetching Participants
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={() => refetch()} variant="outline">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </Page>
    );
  }
  return (
    <Page>
      <div className=" flex w-full p-4 gap-2 relative ">
        {/* registration lIst  */}
        <div
          className={`
            ${isViewExpanded ? "w-[70%]" : "w-full"} 
            transition-all duration-300 ease-in-out 
            pr-4
          `}
        >
          <div className="flex justify-between items-center text-left text-xl text-gray-800 font-[400] mb-2">
            <div>Participants List</div>
            <div className="flex flex-row items-center gap-2">
              <div
                onClick={() => handleStatusFilter("All")}
                className="text-sm bg-purple-100 text-purple-800 px-3 py-1 rounded cursor-pointer"
              >
                Total: {allCount}
              </div>
              <div
                onClick={() => handleStatusFilter("Pending")}
                className="text-sm bg-green-100 text-green-800 px-3 py-1 rounded cursor-pointer"
              >
                Pending: {pendingCount}
              </div>
              <div
                onClick={() => handleStatusFilter("Enquiry")}
                className="text-sm bg-yellow-100 text-yellow-800 px-3 py-1 rounded cursor-pointer"
              >
                Enquiry: {enquiryCount}
              </div>
              <div
                onClick={() => handleStatusFilter("Confirm")}
                className="text-sm bg-blue-100 text-blue-800 px-3 py-1 rounded cursor-pointer"
              >
                Confirm: {confirmCount}
              </div>
              <div
                onClick={() => handleStatusFilter("Stall Issued")}
                className="text-sm bg-gray-100 text-gray-800 px-3 py-1 rounded cursor-pointer"
              >
                Stall Issued: {stallCount}
              </div>
              <div
                onClick={() => handleStatusFilter("Cancel")}
                className="text-sm bg-red-100 text-red-800 px-3 py-1 rounded cursor-pointer"
              >
                Cancel: {cancelCount}
              </div>
            </div>
          </div>
          {/* searching and column filter  */}
          <div className="flex items-center py-4">
            <Input
              placeholder="Search..."
              value={table.getState().globalFilter || ""}
              onChange={(event) => {
                table.setGlobalFilter(event.target.value);
              }}
              className="max-w-sm"
            />
            {/* coulmn filter  */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="ml-auto">
                  Columns <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {table
                  .getAllColumns()
                  .filter((column) => column.getCanHide())
                  .map((column) => {
                    return (
                      <DropdownMenuCheckboxItem
                        key={column.id}
                        className="capitalize"
                        checked={column.getIsVisible()}
                        onCheckedChange={(value) =>
                          column.toggleVisibility(!!value)
                        }
                      >
                        {column.id}
                      </DropdownMenuCheckboxItem>
                    );
                  })}
              </DropdownMenuContent>
            </DropdownMenu>
            {/* date filter  */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="ml-2">
                  {selectedEvent ? `Event ${selectedEvent}` : "Date Filter"}{" "}
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {dateFilter?.map((item, index) => (
                  <DropdownMenuItem
                    key={index}
                    // You might want to add an onClick handler to actually filter the data
                    onClick={() => handleDateFilter(item.event)}
                    className={
                      selectedEvent === item.event ? "bg-gray-100" : ""
                    }
                  >
                    Event {item.event}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            {/* status Filter  */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="ml-2">
                  {selectedStatus || "Status"}
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {Status_Filter?.map((item, index) => (
                  <DropdownMenuItem
                    key={index}
                    onClick={() => handleStatusFilter(item.label)}
                    className={
                      selectedStatus == item.label ? "bg-gray-100" : ""
                    }
                  >
                    {item.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            {/* create participant button */}
            {!isRestrictedUser && (
              <>
                {/* <div onClick={() => navigate(`/create-participants`)}>
                <Button variant="default" className="ml-2">
                  <SquarePlus className="h-4 w-4" /> Participant
                </Button>
              </div> */}
                <ParticipationCreate
                  className="ml-2"
                  onClick={() => navigate(`/create-participants`)}
                />
              </>
            )}

            {!isRestrictedUser && (
              <CreateEnquiry selectedEvent={selectedEvent} />
            )}

            {!isRestrictedUser && (
              <Popover>
                <PopoverTrigger asChild>
                  {/* <Button variant="default" className="ml-2">
                  
                  <SquarePlus className="h-4 w-4" />Messaged
                </Button> */}
                  <div>
                    <ParticipationCrMessage className="ml-2" />
                  </div>
                </PopoverTrigger>

                <PopoverContent className="w-80">
                  <div className="space-y-4">
                    <h4 className="font-medium leading-none">
                      WhatsApp Message
                    </h4>
                    <Textarea
                      placeholder="Type your WhatsApp message..."
                      className="min-h-[100px]"
                      value={globalWhatsappMessage}
                      onChange={(e) => setGlobalWhatsappMessage(e.target.value)}
                    />
                  </div>
                </PopoverContent>
              </Popover>
            )}

          </div>
          {/* table  */}
          <div className="rounded-md border">
            <div className="bg-white    overflow-auto h-[calc(30rem-3rem)]">
              <Table>
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => {
                        return (
                          <TableHead key={header.id}>
                            {header.isPlaceholder
                              ? null
                              : flexRender(
                                  header.column.columnDef.header,
                                  header.getContext()
                                )}
                          </TableHead>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableHeader>

                <TableBody>
                  {table.getRowModel().rows?.length ? (
                    table.getRowModel().rows.map((row) => (
                      <TableRow
                        key={row.id}
                        data-state={row.getIsSelected() && "selected"}
                        onClick={() => handleRowClick(row.original.id)}
                        id={`participant-row-${row.original.id}`}
                        className={
                          highlightedRowId === row.original.id
                            ? "bg-yellow-100 transition-colors duration-1000"
                            : "cursor-pointer hover:bg-gray-100"
                        }
                      >
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id}>
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext()
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={columns.length}
                        className="h-24 text-center"
                      >
                        No results.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
          {/* row slection and pagintaion button  */}
          <div className="flex items-center justify-end space-x-2 py-4">
            <div className="flex-1 text-sm text-muted-foreground">
              Total {table.getFilteredRowModel().rows.length} participation.
            </div>
            <div className="space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                Next
              </Button>
            </div>
          </div>
        </div>

        {isViewExpanded && (
          <div
            className={`
              w-[30%] 
              p-4 
              border-l 
              transition-all 
              duration-300 
              ease-in-out 
              absolute 
              right-0 
             
            
              ${
                isViewExpanded
                  ? "opacity-100 translate-x-0"
                  : "opacity-0 translate-x-full"
              }
            `}
          >
            <div className="flex justify-end mb-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setIsViewExpanded(false);
                  setSelectedId(null);
                }}
              >
                ✕
              </Button>
            </div>
            <ParticipationView id={selectedId} />
          </div>
        )}
      </div>
    </Page>
  );
};

export default ParticipationList;
