import React, { useRef, useState } from "react";
import Page from "../dashboard/page";
import { useQuery } from "@tanstack/react-query";
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
  Printer,
} from "lucide-react";

import { Button } from "@/components/ui/button";
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
import { useReactToPrint } from "react-to-print";

const RegistrationList = () => {
  const printRef = useRef(null);
  const [selectedRegistration, setSelectedRegistration] = useState(null);
  const [printingId, setPrintingId] = useState(null); 
 const [isBulkPrinting, setIsBulkPrinting] = useState(false);
  const {
    data: registrations,
    isLoading,
    isError,
    refetch: refetchRegistrations,
  } = useQuery({
    queryKey: ["registrations"],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${BASE_URL}/api/panel-fetch-register`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data.registerData;
    },
  });

  const [sorting, setSorting] = useState([]);
  const [columnFilters, setColumnFilters] = useState([]);
  const [columnVisibility, setColumnVisibility] = useState({});
  const [rowSelection, setRowSelection] = useState({});

  const handleFetchRegistration = async (id) => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `${BASE_URL}/api/panel-fetch-register-by-id/${id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      return response.data.registerData;
    } catch (error) {
      console.error("Error fetching registration:", error);
      throw error;
    }
  };

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: selectedRegistration
      ? `Registration-${selectedRegistration.fair_person_name}`
      : "Registration",
    pageStyle: `
      @page {
        size: auto;
        margin: 0;
      }
        
      @media print {
        body {
          margin: 0;
          -webkit-print-color-adjust: exact;
        }
        body > div {
          position: absolute;
          top: 210px;
          left: 0;
          width: 100%;
        }
      }
    `,
    onAfterPrint: () => {
      setPrintingId(null);
      refetchRegistrations();
    },
    onPrintError: (error) => {
      console.error("Print error:", error);
      setPrintingId(null);
    }
  });
  const printAllUnprinted = async () => {
    if (!registrations || isBulkPrinting) return;

    const unprintedRows = registrations.filter(
      (row) => !row.fair_print_status || row.fair_print_status !== "Printed"
    );

    for (const row of unprintedRows) {
      try {
        setPrintingId(row.id);
        const data = await handleFetchRegistration(row.id);
        setSelectedRegistration(data);

        await new Promise((resolve) => setTimeout(resolve, 300));

        await new Promise((resolve) => {
          setTimeout(() => {
            handlePrint();

            setTimeout(resolve, 1000);
          }, 100);
        });
      } catch (error) {
        console.error(`Error processing row ${row.id}:`, error);
      } finally {
        setPrintingId(null);

        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }
    setIsBulkPrinting(false);
  };

  const handlePrintClick = async (registration) => {
    try {
      setPrintingId(registration.id); 
      const data = await handleFetchRegistration(registration.id);
      setSelectedRegistration(data);
      setTimeout(handlePrint, 100);
    } catch (error) {
      console.error("Error preparing print:", error);
      setPrintingId(null); 
    }
  };

  const columns = [
    {
      accessorKey: "fair_id",
      header: "Fair Id",
      cell: ({ row }) => <div>{row.getValue("fair_id")}</div>,
    },
    {
      accessorKey: "fair_firm_name",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Firm Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => <div>{row.getValue("fair_firm_name")}</div>,
    },
    {
      accessorKey: "fair_person_name",
      header: "Name",
      cell: ({ row }) => <div>{row.getValue("fair_person_name")}</div>,
    },
    {
      accessorKey: "fair_person_mobile",
      header: "Mobile",
      cell: ({ row }) => <div>{row.getValue("fair_person_mobile")}</div>,
    },
    {
      accessorKey: "fair_print_status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("fair_print_status");
        return (
          <span className="inline-block rounded-md px-2 py-1 text-xs font-normal bg-blue-100 text-blue-800">
            {status}
          </span>
        );
      },
    },
    {
      id: "actions",
      header: "Action",
      cell: ({ row }) => {
        const registration = row.original;
        const isCurrentPrinting = printingId === registration.id;

        return (
          <div className="flex flex-row">
            <Button
              variant="outline"
              size="icon"
              className="top-4 right-4 z-10"
              onClick={() => handlePrintClick(registration)}
              disabled={printingId !== null && !isCurrentPrinting} 
            >
              {isCurrentPrinting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Printer className="h-4 w-4" />
              )}
            </Button>
          </div>
        );
      },
    },
  ];

  const table = useReactTable({
    data: registrations || [],
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
        pageSize: 100,
      },
    },
  });

  if (isLoading) {
    return (
      <Page>
        <div className="flex justify-center items-center h-full">
          <Button disabled>
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading Registrations
          </Button>
        </div>
      </Page>
    );
  }

  if (isError) {
    return (
      <Page>
        <Card className="w-full max-w-md mx-auto mt-10">
          <CardHeader>
            <CardTitle className="text-destructive">
              Error Fetching Registrations
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
      <div className="flex w-full p-4 gap-2">
        <div className="w-[100%]">
          
          <div className="flex justify-between items-center">
                      <div className="flex text-left text-xl text-gray-800 font-[400]">
                      Registrations List
                      </div>
                      <Button
                        variant="outline"
                        onClick={printAllUnprinted}
                        disabled={isBulkPrinting}
                      >
                       {isBulkPrinting ? (
                           <>
                             <Loader2 className="h-4 w-4 animate-spin mr-2" />
                             Printing All...
                           </>
                         ) : (
                           "Print All Unprinted"
                         )}
                      </Button>
                    </div>
          <div className="flex items-center py-4">
            <Input
              placeholder="Search..."
              value={table.getState().globalFilter || ""}
              onChange={(event) => {
                table.setGlobalFilter(event.target.value);
              }}
              className="max-w-sm"
            />
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
          </div>
          <div className="rounded-md border">
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
                      className="cursor-pointer hover:bg-gray-100"
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
          <div className="flex items-center justify-end space-x-2 py-4">
            <div className="flex-1 text-sm text-muted-foreground">
              {table.getFilteredSelectedRowModel().rows.length} of{" "}
              {table.getFilteredRowModel().rows.length} row(s) selected.
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

        <div className="hidden relative">
          {selectedRegistration && (
            <div
              ref={printRef}
              key={selectedRegistration.id}
              className="w-full print:h-96 absolute top-[6.5rem]  mx-auto  max-w-sm left-1/2 -translate-x-1/2 shadow-lg print:border-none bg-white rounded-lg overflow-hidden print:shadow-none  print:rounded-none"
            >
               <div
     className="absolute top-5 w-28 h-28 border-none left-1/2 -translate-x-1/2"
  >
    {selectedRegistration.fair_person_image && (
      <img
      src={`http://southindiagarmentsassociation.com/public/register_images/${selectedRegistration.fair_person_image}`}
      alt="Registrant"
      className="w-full h-full object-cover rounded-none"
    />
    )}
    
  </div>
              <div className="px-12  -translate-y-16 text-center print:absolute border-none print:bottom-28 print:left-1/2 print:transform print:-translate-x-1/2">
                <div className="mb-2">
                  <h2 className="text-lg print:w-80 font-bold text-gray-800">
                    {selectedRegistration.fair_firm_name || ""}
                  </h2>
                </div>
                <div>
                  <h3 className="text-sm font-medium uppercase text-gray-700">
                    {selectedRegistration.fair_person_name || ""}
                  </h3>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Page>
  );
};

export default RegistrationList;